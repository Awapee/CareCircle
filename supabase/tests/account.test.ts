// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import { as, createTestDb, createUser, errorCode } from './harness';

let db: PGlite;
let ann: string;
let ben: string;
let circle: string;

async function invite(admin: string, user: string, role: string) {
  const { rows } = await as(db, admin, (tx) =>
    tx.query<{ t: string }>(`select public.create_invitation($1, $2, '', 7) as t`, [circle, role]),
  );
  await as(db, user, (tx) => tx.query('select public.accept_invitation($1)', [rows[0]!.t]));
}

beforeEach(async () => {
  db = await createTestDb();
  ann = await createUser(db, 'Ann');
  ben = await createUser(db, 'Ben');
  const { rows } = await as(db, ann, (tx) =>
    tx.query<{ id: string }>(`select public.create_circle('Shared', 'UTC', 'Pat', 'admin') as id`),
  );
  circle = rows[0]!.id;
  await invite(ann, ben, 'caregiver');
}, 60_000);

const count = async (sql: string, params: unknown[] = []) =>
  (await db.query<{ n: number }>(`select count(*)::int as n from ${sql}`, params)).rows[0]!.n;

describe('deleting an account', () => {
  it('is refused for the only admin of a circle with other members', async () => {
    expect(await errorCode(as(db, ann, (tx) => tx.query('select public.delete_my_account()')))).toBe('CC400');
  });

  it('removes the person but keeps anonymised shared history', async () => {
    await as(db, ben, (tx) =>
      tx.query(`select public.post_care_update($1, 'Shared note from Ben', 'circle', null)`, [circle]),
    );
    await as(db, ben, (tx) => tx.query(`select public.post_care_update($1, 'Ben private', 'private', null)`, [circle]));
    await as(db, ben, (tx) => tx.query('select public.delete_my_account()'));

    expect(await count('auth.users where id = $1', [ben])).toBe(0);
    expect(await count('profiles where id = $1', [ben])).toBe(0);
    expect(await count('circle_members where user_id = $1', [ben])).toBe(0);
    expect(await count(`care_updates where body = 'Ben private'`)).toBe(0);
    // The shared update stays, without an author.
    const shared = await db.query<{ author_id: string | null }>(
      `select author_id from care_updates where body = 'Shared note from Ben'`,
    );
    expect(shared.rows).toEqual([{ author_id: null }]);
    // History no longer names him.
    const summaries = (await db.query<{ summary: string }>('select summary from activity_events')).rows.map(
      (r) => r.summary,
    );
    expect(summaries.some((s) => /\bBen\b/.test(s))).toBe(false);
    expect(summaries).toContain('A former member joined as caregiver');
  });

  it('deletes circles where the person was the only member', async () => {
    const solo = await createUser(db, 'Solo');
    await as(db, solo, (tx) => tx.query(`select public.create_circle('Mine', 'UTC', 'Me', 'admin')`));
    await as(db, solo, (tx) => tx.query('select public.delete_my_account()'));
    expect(await count(`care_circles where name = 'Mine'`)).toBe(0);
    expect(await count(`care_circles where name = 'Shared'`)).toBe(1);
  });
});

describe('deleting a circle', () => {
  it('needs an admin and the exact name, then removes everything in it', async () => {
    expect(await errorCode(as(db, ben, (tx) => tx.query(`select public.delete_circle($1, 'Shared')`, [circle])))).toBe(
      'CC403',
    );
    expect(await errorCode(as(db, ann, (tx) => tx.query(`select public.delete_circle($1, 'shared')`, [circle])))).toBe(
      'CC400',
    );
    await as(db, ann, (tx) => tx.query(`select public.delete_circle($1, 'Shared')`, [circle]));
    expect(await count('care_circles')).toBe(0);
    expect(await count('circle_members')).toBe(0);
    expect(await count('activity_events')).toBe(0);
  });
});
