// @vitest-environment node
import type { PGlite, Transaction } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { as, createTestDb, createUser, errorCode } from './harness';

let db: PGlite;
let alice: string; // admin of circle A
let bob: string; // caregiver in circle A
let fran: string; // family in circle A
let rita: string; // read-only in circle A
let mallory: string; // admin of circle B, not in A
let circleA: string;
let circleB: string;

const one = async <T>(tx: Transaction, sql: string, params: unknown[] = []) =>
  (await tx.query<T>(sql, params)).rows[0]!;
const all = async <T>(tx: Transaction, sql: string, params: unknown[] = []) => (await tx.query<T>(sql, params)).rows;

function taskInput(over: Record<string, unknown> = {}) {
  return {
    title: 'Morning tablets',
    category: 'medication',
    notes: '',
    recurrence: { kind: 'daily' },
    times: ['08:00'],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: null,
    assigneeId: null,
    followUpMinutes: 30,
    reminderMinutesBefore: 15,
    medication: { name: 'Example tablet 5mg', instructions: 'With breakfast' },
    appointment: null,
    ...over,
  };
}

async function saveTask(
  user: string,
  circle: string,
  input: Record<string, unknown>,
  taskId: string | null = null,
  version: number | null = null,
) {
  return as(db, user, (tx) =>
    one<{ id: string }>(tx, 'select public.save_task($1, $2, $3, $4) as id', [circle, taskId, version, input]),
  ).then((r) => r.id);
}

/** Adds a member directly with a chosen role, via a real invitation. */
async function join(admin: string, circle: string, user: string, role: string) {
  const { token } = await as(db, admin, (tx) =>
    one<{ token: string }>(tx, 'select public.create_invitation($1, $2, $3, 7) as token', [circle, role, '']),
  );
  await as(db, user, (tx) => tx.query('select public.accept_invitation($1)', [token]));
}

beforeAll(async () => {
  db = await createTestDb();
  [alice, bob, fran, rita, mallory] = await Promise.all(
    ['Alice', 'Bob', 'Fran', 'Rita', 'Mallory'].map((n) => createUser(db, n)),
  );
  circleA = (
    await as(db, alice, (tx) =>
      one<{ id: string }>(tx, `select public.create_circle('Rose family', 'Europe/London', 'Rose', 'admin') as id`),
    )
  ).id;
  circleB = (
    await as(db, mallory, (tx) =>
      one<{ id: string }>(tx, `select public.create_circle('Other circle', 'UTC', 'Pat', 'admin') as id`),
    )
  ).id;
  await join(alice, circleA, bob, 'caregiver');
  await join(alice, circleA, fran, 'family');
  await join(alice, circleA, rita, 'read_only');
}, 60_000);

describe('sign-up', () => {
  it('creates a profile and default preferences for each new user', async () => {
    const p = await as(db, alice, (tx) =>
      one<{ display_name: string; time_zone: string }>(tx, 'select * from profiles where id = $1', [alice]),
    );
    expect(p).toMatchObject({ display_name: 'Alice', time_zone: 'Europe/London' });
    const prefs = await as(db, alice, (tx) => all(tx, 'select * from user_preferences'));
    expect(prefs).toHaveLength(1);
  });
});

describe('isolation between circles', () => {
  it('anonymous visitors cannot read anything', async () => {
    expect(await errorCode(as(db, null, (tx) => tx.query('select * from care_circles')))).toBe('42501');
    expect(await errorCode(as(db, null, (tx) => tx.query('select * from tasks')))).toBe('42501');
  });

  it('members only see their own circles', async () => {
    const seenByAlice = await as(db, alice, (tx) => all<{ id: string }>(tx, 'select id from care_circles'));
    expect(seenByAlice.map((c) => c.id)).toEqual([circleA]);
    const seenByMallory = await as(db, mallory, (tx) => all<{ id: string }>(tx, 'select id from care_circles'));
    expect(seenByMallory.map((c) => c.id)).toEqual([circleB]);
  });

  it('a user cannot read or change another circle’s data by using its IDs', async () => {
    const taskId = await saveTask(alice, circleA, taskInput());
    const peek = await as(db, mallory, (tx) => all(tx, 'select * from tasks where id = $1', [taskId]));
    expect(peek).toEqual([]);
    const occs = await as(db, mallory, (tx) =>
      all(tx, 'select * from task_occurrences where circle_id = $1', [circleA]),
    );
    expect(occs).toEqual([]);
    expect(await errorCode(saveTask(mallory, circleA, taskInput()))).toBe('CC403');
    const occ = await as(db, alice, (tx) =>
      one<{ id: string; version: number }>(tx, 'select id, version from task_occurrences where task_id = $1 limit 1', [
        taskId,
      ]),
    );
    expect(
      await errorCode(
        as(db, mallory, (tx) => tx.query(`select public.record_outcome($1, 'taken', '', $2)`, [occ.id, occ.version])),
      ),
    ).toBe('CC403');
    expect(await errorCode(as(db, mallory, (tx) => tx.query('select public.delete_task($1)', [taskId])))).toBe('CC403');
    const members = await as(db, mallory, (tx) =>
      all(tx, 'select * from circle_members where circle_id = $1', [circleA]),
    );
    expect(members).toEqual([]);
  });

  it('profiles are visible only to people who share a circle', async () => {
    const names = await as(db, mallory, (tx) => all<{ display_name: string }>(tx, 'select display_name from profiles'));
    expect(names.map((n) => n.display_name)).toEqual(['Mallory']);
  });

  it('signed-in users cannot write to shared tables directly', async () => {
    expect(
      await errorCode(
        as(db, alice, (tx) =>
          tx.query(`insert into care_updates (circle_id, author_id, body, visibility) values ($1, $2, 'x', 'circle')`, [
            circleA,
            alice,
          ]),
        ),
      ),
    ).toBe('42501');
    expect(await errorCode(as(db, alice, (tx) => tx.query(`update tasks set title = 'x'`)))).toBe('42501');
    expect(await errorCode(as(db, alice, (tx) => tx.query(`delete from activity_events`)))).toBe('42501');
  });

  it('users can edit their own profile but not someone else’s', async () => {
    await as(db, bob, (tx) => tx.query(`update profiles set display_name = 'Bob B' where id = $1`, [bob]));
    const res = await as(db, bob, (tx) =>
      tx.query(`update profiles set display_name = 'Hacked' where id = $1`, [alice]),
    );
    expect(res.affectedRows).toBe(0);
    const p = await as(db, alice, (tx) =>
      one<{ display_name: string }>(tx, 'select display_name from profiles where id = $1', [alice]),
    );
    expect(p.display_name).toBe('Alice');
  });

  it('only the database can run the scheduler', async () => {
    expect(await errorCode(as(db, alice, (tx) => tx.query('select public.run_scheduler()')))).toBe('42501');
  });
});

describe('roles', () => {
  it('family cannot see medication details unless the circle allows it', async () => {
    await saveTask(alice, circleA, taskInput({ title: 'Evening tablets' }));
    const asFamily = await as(db, fran, (tx) => all(tx, 'select * from medication_details'));
    expect(asFamily).toEqual([]);
    const asReadOnly = await as(db, rita, (tx) => all(tx, 'select * from medication_details'));
    expect(asReadOnly).toEqual([]);
    const asCaregiver = await as(db, bob, (tx) => all(tx, 'select * from medication_details'));
    expect(asCaregiver.length).toBeGreaterThan(0);

    const c = await as(db, alice, (tx) =>
      one<{ version: number }>(tx, 'select version from care_circles where id = $1', [circleA]),
    );
    await as(db, alice, (tx) =>
      tx.query(`select public.update_circle($1, 'Rose family', 'Europe/London', true, 'Rose', '', $2)`, [
        circleA,
        c.version,
      ]),
    );
    const afterSetting = await as(db, fran, (tx) => all(tx, 'select * from medication_details'));
    expect(afterSetting.length).toBeGreaterThan(0);
  });

  it('family can record outcomes only for tasks assigned to them', async () => {
    const mine = await saveTask(
      bob,
      circleA,
      taskInput({ title: 'Lunch', category: 'meal', medication: null, assigneeId: fran }),
    );
    const notMine = await saveTask(bob, circleA, taskInput({ title: 'Walk', category: 'routine', medication: null }));
    const occOf = (task: string) =>
      as(db, fran, (tx) =>
        one<{ id: string; version: number }>(
          tx,
          'select id, version from task_occurrences where task_id = $1 limit 1',
          [task],
        ),
      );
    const a = await occOf(mine);
    const b = await occOf(notMine);
    expect(
      await errorCode(
        as(db, fran, (tx) => tx.query(`select public.record_outcome($1, 'completed', '', $2)`, [a.id, a.version])),
      ),
    ).toBeNull();
    expect(
      await errorCode(
        as(db, fran, (tx) => tx.query(`select public.record_outcome($1, 'completed', '', $2)`, [b.id, b.version])),
      ),
    ).toBe('CC403');
  });

  it('caregivers create tasks but cannot delete them; family cannot create them', async () => {
    const id = await saveTask(bob, circleA, taskInput({ title: 'Water', category: 'hydration', medication: null }));
    expect(await errorCode(as(db, bob, (tx) => tx.query('select public.delete_task($1)', [id])))).toBe('CC403');
    expect(await errorCode(saveTask(fran, circleA, taskInput({ category: 'meal', medication: null })))).toBe('CC403');
    expect(await errorCode(as(db, alice, (tx) => tx.query('select public.delete_task($1)', [id])))).toBeNull();
  });

  it('read-only members cannot post updates', async () => {
    expect(
      await errorCode(
        as(db, rita, (tx) => tx.query(`select public.post_care_update($1, 'hi', 'circle', null)`, [circleA])),
      ),
    ).toBe('CC403');
  });

  it('private notes are visible only to their author', async () => {
    await as(db, bob, (tx) =>
      tx.query(`select public.post_care_update($1, 'My own note', 'private', null)`, [circleA]),
    );
    await as(db, bob, (tx) =>
      tx.query(`select public.post_care_update($1, 'Rose had a good morning', 'circle', null)`, [circleA]),
    );
    const seenByAlice = await as(db, alice, (tx) => all<{ body: string }>(tx, 'select body from care_updates'));
    expect(seenByAlice.map((u) => u.body)).toEqual(['Rose had a good morning']);
    const seenByBob = await as(db, bob, (tx) =>
      all<{ body: string }>(tx, 'select body from care_updates order by created_at'),
    );
    expect(seenByBob).toHaveLength(2);
    // Posting to the circle notifies the other members.
    const n = await as(db, alice, (tx) =>
      all<{ kind: string }>(tx, `select kind from notifications where kind = 'update'`),
    );
    expect(n).toHaveLength(1);
  });

  it('only admins manage members, and the last admin cannot leave', async () => {
    expect(
      await errorCode(
        as(db, bob, (tx) => tx.query(`select public.change_member_role($1, $2, 'admin')`, [circleA, bob])),
      ),
    ).toBe('CC403');
    expect(
      await errorCode(as(db, alice, (tx) => tx.query('select public.remove_member($1, $2)', [circleA, alice]))),
    ).toBe('CC400');
    expect(
      await errorCode(
        as(db, alice, (tx) => tx.query(`select public.change_member_role($1, $2, 'family')`, [circleA, alice])),
      ),
    ).toBe('CC400');
  });
});

describe('invitations', () => {
  it('stores only a hash, works once, and can be revoked', async () => {
    const newcomer = await createUser(db, 'Nina');
    const { token } = await as(db, alice, (tx) =>
      one<{ token: string }>(tx, `select public.create_invitation($1, 'family', 'Nina', 7) as token`, [circleA]),
    );
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    // The hash column is not readable, even by admins.
    expect(await errorCode(as(db, alice, (tx) => tx.query('select token_hash from invitations')))).toBe('42501');
    const preview = await as(db, newcomer, (tx) =>
      one<{ status: string }>(tx, 'select * from public.invitation_preview($1)', [token]),
    );
    expect(preview.status).toBe('valid');
    await as(db, newcomer, (tx) => tx.query('select public.accept_invitation($1)', [token]));
    expect(await errorCode(as(db, newcomer, (tx) => tx.query('select public.accept_invitation($1)', [token])))).toBe(
      'CC404',
    );

    const { token: t2 } = await as(db, alice, (tx) =>
      one<{ token: string }>(tx, `select public.create_invitation($1, 'caregiver', '', 7) as token`, [circleA]),
    );
    const inv = await as(db, alice, (tx) =>
      one<{ id: string }>(tx, `select id from invitations where accepted_at is null and revoked_at is null`),
    );
    await as(db, alice, (tx) => tx.query('select public.revoke_invitation($1)', [inv.id]));
    expect(await errorCode(as(db, mallory, (tx) => tx.query('select public.accept_invitation($1)', [t2])))).toBe(
      'CC404',
    );
  });

  it('non-admins cannot create invitations', async () => {
    expect(
      await errorCode(as(db, bob, (tx) => tx.query(`select public.create_invitation($1, 'admin', '', 7)`, [circleA]))),
    ).toBe('CC403');
  });
});

describe('concurrent edits', () => {
  it('rejects an update made from an out-of-date version', async () => {
    const id = await saveTask(alice, circleA, taskInput({ title: 'Breakfast', category: 'meal', medication: null }));
    await saveTask(bob, circleA, taskInput({ title: 'Breakfast (oats)', category: 'meal', medication: null }), id, 1);
    expect(
      await errorCode(
        saveTask(alice, circleA, taskInput({ title: 'Breakfast (toast)', category: 'meal', medication: null }), id, 1),
      ),
    ).toBe('CC409');
  });
});

describe('scheduling', () => {
  it('stores local times in the circle’s time zone across daylight saving', async () => {
    const res = await db.query<{ at: string }>(
      `select to_char((('2026-03-28'::date + '08:00'::time) at time zone 'Europe/London') at time zone 'UTC', 'YYYY-MM-DD HH24:MI') as at
       union all
       select to_char((('2026-03-30'::date + '08:00'::time) at time zone 'Europe/London') at time zone 'UTC', 'YYYY-MM-DD HH24:MI')`,
    );
    expect(res.rows.map((r) => r.at)).toEqual(['2026-03-28 08:00', '2026-03-30 07:00']);
  });

  it('never creates duplicate occurrences, even when the scheduler runs twice', async () => {
    const id = await saveTask(
      alice,
      circleA,
      taskInput({ title: 'Stretching', category: 'routine', medication: null }),
    );
    const count = async () =>
      (await db.query<{ n: number }>('select count(*)::int as n from task_occurrences where task_id = $1', [id]))
        .rows[0]!.n;
    const before = await count();
    await db.query('select public.run_scheduler()');
    await db.query('select public.run_scheduler()');
    expect(await count()).toBe(before);
    expect(before).toBe(15); // today plus 14 days ahead
  });

  it('sends one reminder and one follow-up per person, and logs the follow-up once', async () => {
    const id = await saveTask(
      alice,
      circleA,
      taskInput({
        title: 'Check-in call',
        category: 'other',
        medication: null,
        assigneeId: bob,
        followUpMinutes: 30,
        reminderMinutesBefore: 10,
      }),
    );
    const occ = (
      await db.query<{ id: string; scheduled_at: Date }>(
        'select id, scheduled_at from task_occurrences where task_id = $1 order by scheduled_at limit 1',
        [id],
      )
    ).rows[0]!;
    const at = (mins: number) => new Date(occ.scheduled_at.getTime() + mins * 60_000).toISOString();
    const notes = async (kind: string) =>
      (
        await db.query<{ recipient_id: string }>(
          'select recipient_id from notifications where occurrence_id = $1 and kind = $2',
          [occ.id, kind],
        )
      ).rows;

    await db.query('select public.run_scheduler($1)', [at(-20)]);
    expect(await notes('reminder')).toEqual([]);
    await db.query('select public.run_scheduler($1)', [at(-5)]);
    await db.query('select public.run_scheduler($1)', [at(-4)]);
    expect((await notes('reminder')).map((n) => n.recipient_id)).toEqual([bob]);

    await db.query('select public.run_scheduler($1)', [at(31)]);
    await db.query('select public.run_scheduler($1)', [at(32)]);
    const followUps = (await notes('follow_up')).map((n) => n.recipient_id).sort();
    expect(followUps).toEqual([alice, bob].sort()); // Alice is the follow-up contact, Bob the assignee
    const logged = await db.query('select 1 from activity_events where subject_id = $1 and type = $2', [
      occ.id,
      'follow_up_due',
    ]);
    expect(logged.rows).toHaveLength(1);
  });

  it('holds notifications during quiet hours', async () => {
    await db.query(`update user_preferences set quiet_start = '00:00', quiet_end = '23:59' where user_id = $1`, [fran]);
    const id = await saveTask(
      alice,
      circleA,
      taskInput({ title: 'Tea', category: 'hydration', medication: null, assigneeId: fran }),
    );
    const occ = (
      await db.query<{ id: string; scheduled_at: Date }>(
        'select id, scheduled_at from task_occurrences where task_id = $1 order by scheduled_at limit 1',
        [id],
      )
    ).rows[0]!;
    await db.query('select public.run_scheduler($1)', [
      new Date(occ.scheduled_at.getTime() - 5 * 60_000).toISOString(),
    ]);
    const n = await db.query('select 1 from notifications where occurrence_id = $1 and recipient_id = $2', [
      occ.id,
      fran,
    ]);
    expect(n.rows).toEqual([]);
  });
});
