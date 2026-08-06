-- Just enough Supabase to run schema.sql unmodified: the roles, the auth and
-- storage schemas, and the handful of functions the policies call.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique
);

-- Supabase reads the signed-in user out of the request's JWT claims.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create schema storage;
create table storage.buckets (
  id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[]
  language sql immutable as $$ select string_to_array(name, '/') $$;
grant usage on schema storage to anon, authenticated;
grant all on storage.objects to anon, authenticated;
