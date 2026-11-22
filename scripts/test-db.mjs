// Executes the real migration and TAP policy tests in embedded PostgreSQL.
// Minimal auth/storage schemas model the hosted interfaces, not their services.
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
const db = new PGlite();
try {
  await db.exec(`create role anon;create role authenticated;
create schema auth;create schema storage;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,storage to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text references storage.buckets(id),name text);
alter table storage.objects enable row level security;
grant select,insert,delete,update on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;`);
  const migration = await readFile('supabase/migrations/202611220001_initial.sql', 'utf8');
  await db.exec(migration.replace('create extension if not exists pgcrypto;', ''));
  const results = await db.exec(await readFile('supabase/tests/ownership.sql', 'utf8'));
  const lines = results
    .flatMap((r) => r.rows)
    .flatMap((r) => Object.values(r))
    .filter((v) => typeof v === 'string' && /^(ok |1\.\.)/.test(v));
  for (const line of lines) console.log(line);
  if (lines.filter((l) => l.startsWith('ok ')).length !== 24)
    throw new Error('Expected 24 database policy assertions.');
  console.log(
    'Embedded PostgreSQL: migration and 24 ownership assertions passed. Hosted Supabase services still need integration verification.',
  );
} catch (e) {
  console.error('Database test failed:', e.message, e.detail || '', e.where || '');
  process.exitCode = 1;
} finally {
  await db.close();
}
