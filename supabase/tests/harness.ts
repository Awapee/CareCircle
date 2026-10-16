import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PGlite, type Transaction } from '@electric-sql/pglite';

/**
 * Runs the real migrations in PGlite (PostgreSQL compiled to WebAssembly) with a minimal
 * stand-in for Supabase's `auth` schema, so RLS and the SQL functions can be tested without
 * Docker or a hosted project.
 */

const MIGRATIONS = ['0001_schema.sql', '0002_security.sql', '0003_functions.sql', '0005_account.sql'];
// 0004_schedule.sql needs the pg_cron extension, which PGlite doesn't have; run_scheduler() is called directly instead.

const AUTH_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub', '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(AUTH_STUB);
  for (const file of MIGRATIONS) {
    const sql = readFileSync(fileURLToPath(new URL(`../migrations/${file}`, import.meta.url)), 'utf8');
    await db.exec(sql);
  }
  return db;
}

export async function createUser(db: PGlite, displayName: string, timeZone = 'Europe/London'): Promise<string> {
  const res = await db.query<{ id: string }>(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [`${displayName.toLowerCase()}@example.test`, { display_name: displayName, time_zone: timeZone }],
  );
  return res.rows[0]!.id;
}

/** Runs `fn` as a signed-in user (role `authenticated`, JWT `sub` = userId), or as an anonymous visitor. */
export async function as<T>(db: PGlite, userId: string | null, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${userId ? 'authenticated' : 'anon'}`);
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify(userId ? { sub: userId } : {}),
    ]);
    return fn(tx);
  });
}

/** The SQLSTATE of a failed call, or null if it succeeded. */
export async function errorCode(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (e) {
    return (e as { code?: string }).code ?? 'unknown';
  }
}
