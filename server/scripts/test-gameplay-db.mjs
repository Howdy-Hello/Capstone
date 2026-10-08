// Applies every migration to a disposable in-memory PostgreSQL (PGlite) with
// minimal Supabase stubs, then runs gameplay-db-checks.sql.
// Never connects to a deployed database.
// Run with: node server/scripts/test-gameplay-db.mjs [path to @electric-sql/pglite]
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : '@electric-sql/pglite');
const here = path.dirname(fileURLToPath(import.meta.url));
const db = new PGlite();

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}', created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, owner_id text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  -- Supabase grants these by default; RLS policies do the real filtering.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`);

const migrations = path.resolve(here, '../../supabase/migrations');
for (const name of (await fs.readdir(migrations)).filter((n) => n.endsWith('.sql')).sort()) {
  try {
    await db.exec(await fs.readFile(path.join(migrations, name), 'utf8'));
  } catch (error) {
    console.error('Migration failed:', name, '-', error.message);
    process.exit(1);
  }
}
console.log('All migrations applied to disposable PostgreSQL.');

const results = await db.exec(await fs.readFile(path.join(here, 'gameplay-db-checks.sql'), 'utf8'));
const checks = results.flatMap((r) => r.rows).filter((row) => 'name' in row && 'ok' in row);
for (const check of checks) console.log(check.ok ? 'ok  ' : 'FAIL', check.name);
const failed = checks.filter((check) => !check.ok);
if (!checks.length || failed.length) {
  console.error(`${failed.length} of ${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`All ${checks.length} gameplay checks passed.`);
