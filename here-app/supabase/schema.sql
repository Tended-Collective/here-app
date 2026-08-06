-- Here — database schema.
--
-- Run this once, whole, in the Supabase SQL editor. It is written to be safe to
-- re-run: every object is created if-not-exists and every policy is dropped
-- before it is recreated.
--
-- ─── What is here and what is deliberately not ───────────────────────────────
--
-- On the server: the things a teacher publishes. Posts, comments, the photo
-- attached to a post, who they follow, who they blocked, what they reported,
-- and the public byline that appears under their name.
--
-- Never on the server: the daily check-in scores, the self-care list and its
-- ticks. Those stay in one AsyncStorage row on the phone that made them. That
-- is the app's central promise and there is no table here that could hold them
-- even by accident.
--
-- Also never here: the teacher's real name. The app keeps it on the device to
-- show them what they verified with. It is not a column below.
--
-- The one piece of identity this design cannot avoid is the email address.
-- Supabase Auth stores it in `auth.users` because it is what a code gets sent
-- to and what signing in again is matched against — that is true of any
-- email-based sign-in, not a choice made here. What *is* a choice: it lives
-- only in `auth.users`, which no policy below exposes to another user, and it
-- is never copied into a table that a feed query can reach.
--
-- ─── How access is enforced ──────────────────────────────────────────────────
--
-- Row Level Security, on every table, with no exceptions. Not in the app.
--
-- The distinction matters more than it sounds. A check in the app is a check an
-- attacker skips: the anon key ships inside the iOS binary, anyone can pull it
-- out and talk to this database directly with curl. Everything below assumes
-- that has already happened. If a policy does not permit a read, no amount of
-- crafted request produces the row.
--
-- Two consequences worth stating outright, because they are unusual and they
-- are on purpose:
--
--   Nobody can see who liked a post. `likes` rows are readable only by the
--   person who made them. The number under the heart comes from a counter on
--   the post, maintained by a trigger. In an app where the posts are "here is
--   how I coped this week", a public list of who quietly agreed is a list
--   somebody's colleague should not be able to read.
--
--   Nobody can see who follows them. `follows` is readable only by the
--   follower. There is no follower count in the app and this makes sure there
--   cannot quietly become one.

-- ─── Extensions ──────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive usernames

-- ─── Who cannot sign up ──────────────────────────────────────────────────────
--
-- The app refuses consumer mail providers before it sends anything, but that
-- check runs on a phone and a phone is not a security boundary. This is the
-- same rule where it cannot be skipped.
--
-- Inverted deliberately, and the reasoning is in lib/verification.ts: there is
-- no usable list of school domains. DC is k12.dc.gov, Los Angeles Unified is
-- lausd.net, Houston is houstonisd.org. Any allowlist turns away real teachers,
-- and turning away a real teacher is a worse failure than letting somebody
-- reach a code they will never receive. So: block the mail providers that are
-- definitely not a school, and let the code do the proving.

create table if not exists public.blocked_domains (
  domain text primary key
);

insert into public.blocked_domains (domain) values
  ('gmail.com'), ('googlemail.com'), ('yahoo.com'), ('ymail.com'),
  ('hotmail.com'), ('outlook.com'), ('live.com'), ('msn.com'),
  ('icloud.com'), ('me.com'), ('mac.com'), ('aol.com'),
  ('proton.me'), ('protonmail.com'), ('gmx.com'), ('mail.com'),
  ('zoho.com'), ('yandex.com')
on conflict (domain) do nothing;

create or replace function public.reject_consumer_domains()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  addr_domain text := lower(split_part(new.email, '@', 2));
begin
  if exists (select 1 from public.blocked_domains d where d.domain = addr_domain) then
    raise exception 'Use the address your school gave you, not a personal one.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_consumer_domains on auth.users;
create trigger reject_consumer_domains
  before insert on auth.users
  for each row execute function public.reject_consumer_domains();

-- ─── Reserved usernames ──────────────────────────────────────────────────────
--
-- Two groups: names that would let an account pass as the app, and names that
-- would let it pass as a school official. "heresupport" or "principal" is a
-- phishing surface before it is anything else. Kept as a table rather than a
-- CHECK so the list can be added to without a migration.
--
-- "tended" and its variants stay reserved after the rename. Tended Collective
-- owns the domain this app links to; releasing the old name would hand someone
-- the previous name of the thing they are reading.

create table if not exists public.reserved_usernames (
  username citext primary key
);

insert into public.reserved_usernames (username) values
  ('here'), ('hereapp'), ('herecollective'),
  ('tended'), ('tendedapp'), ('tendedcollective'),
  ('support'), ('help'), ('admin'), ('administrator'),
  ('moderator'), ('mod'), ('staff'), ('team'), ('official'),
  ('security'), ('billing'), ('privacy'),
  ('principal'), ('superintendent'), ('hr'), ('district'),
  ('everyone'), ('me'), ('you'), ('null'), ('undefined'),
  ('root'), ('system'), ('about'), ('settings'), ('login'), ('signup')
on conflict (username) do nothing;

-- ─── profiles ────────────────────────────────────────────────────────────────
--
-- The public byline, and only that. Every column here is something the teacher
-- chose to put on their posts; the `show_*` flags are their answer to whether
-- each one appears, kept server-side so the choice travels with the account
-- rather than living on one phone.
--
-- `username` is citext, so `Ms.P` and `ms.p` collide as they must. A namespace
-- where they differ only by case is a namespace built for impersonation.

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      citext not null unique,
  display_name  text   not null,
  job           text   not null default '',
  level         text   not null default '',
  zip           text   not null default '',
  state         text   not null default '',
  years         int,
  show_job      boolean not null default true,
  show_level    boolean not null default true,
  show_state    boolean not null default true,
  show_years    boolean not null default true,
  created_at    timestamptz not null default now(),

  constraint username_shape check (
    length(username::text) between 3 and 20
    and username::text ~ '^[a-z0-9]([a-z0-9]|[._](?![._]))*[a-z0-9]$'
  ),
  constraint display_name_length check (length(display_name) between 1 and 60),
  constraint zip_shape  check (zip = '' or zip ~ '^[0-9]{5}$'),
  constraint years_sane check (years is null or years between 0 and 70)
);

-- "Near my school" matches on the first three digits of the ZIP — roughly a
-- metro or a rural county. Indexed on that prefix rather than the whole ZIP,
-- because the whole ZIP is never what is queried.
create index if not exists profiles_zip3_idx on public.profiles (left(zip, 3));

create or replace function public.reject_reserved_username()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.reserved_usernames r where r.username = new.username) then
    raise exception 'That username is reserved.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_reserved_username on public.profiles;
create trigger reject_reserved_username
  before insert or update of username on public.profiles
  for each row execute function public.reject_reserved_username();

-- ─── posts ───────────────────────────────────────────────────────────────────
--
-- One sentence about something the author did for themselves.
--
-- `hidden` is the moderation lever. A report does not set it — a report hides
-- the post for the person who reported it, immediately and locally, which is
-- the `reports` policy further down. This is a human deciding the post comes
-- down for everybody. Apple's guideline 1.2 wants that to happen within 24
-- hours of a report; the queue that surfaces them is at the bottom of this file.
--
-- The counters are maintained by triggers rather than counted per query. They
-- are also the only way anyone sees a like total, because the `likes` rows
-- themselves are private to the person who made them.

create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  author        uuid not null references public.profiles (id) on delete cascade,
  body          text not null,
  -- Storage object path, not a URL: `<user id>/<uuid>.jpg`. The bucket is
  -- public-read, so the app builds the URL from this.
  photo_path    text,
  like_count    int not null default 0,
  repost_count  int not null default 0,
  comment_count int not null default 0,
  hidden        boolean not null default false,
  hidden_reason text,
  created_at    timestamptz not null default now(),
  edited_at     timestamptz,

  -- 140 characters, matching UPDATE_MAX_LENGTH in store.tsx. Long enough for a
  -- sentence, short enough that it stays one.
  constraint body_length check (length(body) between 1 and 140)
);

create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_author_idx  on public.posts (author, created_at desc);

-- ─── comments ────────────────────────────────────────────────────────────────

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  author     uuid not null references public.profiles (id) on delete cascade,
  body       text not null,
  hidden     boolean not null default false,
  created_at timestamptz not null default now(),

  -- 280, matching COMMENT_MAX_LENGTH. A comment is usually the explanation of
  -- how a thing went, which needs more room than the post did.
  constraint comment_length check (length(body) between 1 and 280)
);

create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- ─── reactions, follows, blocks ──────────────────────────────────────────────

create table if not exists public.likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.reposts (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.follows (
  follower   uuid not null references public.profiles (id) on delete cascade,
  followee   uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  constraint no_self_follow check (follower <> followee)
);

create table if not exists public.blocks (
  blocker    uuid not null references public.profiles (id) on delete cascade,
  blocked    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  constraint no_self_block check (blocker <> blocked)
);

-- ─── reports ─────────────────────────────────────────────────────────────────
--
-- Write-only from the app's point of view: a teacher can file one and can never
-- read the table, including their own rows. Reading is the moderator's job and
-- happens through the service key, never the anon key the app carries.
--
-- The row does double duty. It is the moderation queue, and it is also what
-- hides the post from the person who reported it — see the posts SELECT policy.
-- Somebody who has just objected to something should not have to keep looking
-- at it while a human gets round to deciding.

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter    uuid not null references public.profiles (id) on delete cascade,
  post_id     uuid references public.posts (id) on delete cascade,
  comment_id  uuid references public.comments (id) on delete cascade,
  reason      text not null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),

  constraint reason_length check (length(reason) between 1 and 500),
  -- Exactly one target.
  constraint one_target check (num_nonnulls(post_id, comment_id) = 1)
);

create index if not exists reports_open_idx
  on public.reports (created_at) where resolved_at is null;

-- ─── Counter triggers ────────────────────────────────────────────────────────
--
-- `security definer` because the person liking a post is not allowed to UPDATE
-- that post — the policy below restricts updates to the author. The trigger
-- runs as the function owner so the counter can move without opening the post
-- row to everyone who can tap a heart.

create or replace function public.bump_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  col  text := tg_argv[0];
  pid  uuid := coalesce(new.post_id, old.post_id);
  step int  := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  execute format(
    'update public.posts set %I = greatest(0, %I + $1) where id = $2', col, col
  ) using step, pid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists likes_count    on public.likes;
drop trigger if exists reposts_count  on public.reposts;
drop trigger if exists comments_count on public.comments;

create trigger likes_count    after insert or delete on public.likes
  for each row execute function public.bump_counter('like_count');
create trigger reposts_count  after insert or delete on public.reposts
  for each row execute function public.bump_counter('repost_count');
create trigger comments_count after insert or delete on public.comments
  for each row execute function public.bump_counter('comment_count');

-- An edit stamps `edited_at` here rather than trusting the client to. `created_at`
-- is held to its original value in the same trigger: without that, an edit could
-- move a post back to the top of the feed, which is a way to bump yourself.

create or replace function public.stamp_edit()
returns trigger
language plpgsql
as $$
begin
  new.created_at := old.created_at;
  new.author     := old.author;
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists posts_stamp_edit on public.posts;
create trigger posts_stamp_edit
  before update on public.posts
  for each row execute function public.stamp_edit();

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table public.profiles          enable row level security;
alter table public.posts             enable row level security;
alter table public.comments          enable row level security;
alter table public.likes             enable row level security;
alter table public.reposts           enable row level security;
alter table public.follows           enable row level security;
alter table public.blocks            enable row level security;
alter table public.reports           enable row level security;
alter table public.blocked_domains   enable row level security;
alter table public.reserved_usernames enable row level security;

-- profiles: the byline is public to signed-in users, because it is printed on
-- every post. Only the owner writes their own.
drop policy if exists profiles_read   on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;

create policy profiles_read on public.profiles
  for select to authenticated using (true);
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- reserved_usernames: readable so the app can grey out a reserved name while
-- someone types, rather than only failing at submit.
drop policy if exists reserved_read on public.reserved_usernames;
create policy reserved_read on public.reserved_usernames
  for select to authenticated, anon using (true);

-- blocked_domains: no policy at all, so no client can read it. The rule is
-- enforced by the trigger; the list itself is not something to hand out.

-- posts: visible to any signed-in teacher, minus four cases —
--   a moderator took it down,
--   its author is someone you blocked,
--   someone whose block list you are on wrote it,
--   you reported it.
drop policy if exists posts_read   on public.posts;
drop policy if exists posts_insert on public.posts;
drop policy if exists posts_update on public.posts;
drop policy if exists posts_delete on public.posts;

create policy posts_read on public.posts
  for select to authenticated using (
    not hidden
    and not exists (
      select 1 from public.blocks b
      where (b.blocker = auth.uid() and b.blocked = posts.author)
         or (b.blocker = posts.author and b.blocked = auth.uid())
    )
    and not exists (
      select 1 from public.reports r
      where r.reporter = auth.uid() and r.post_id = posts.id
    )
  );

create policy posts_insert on public.posts
  for insert to authenticated with check (author = auth.uid());
create policy posts_update on public.posts
  for update to authenticated using (author = auth.uid()) with check (author = auth.uid());
create policy posts_delete on public.posts
  for delete to authenticated using (author = auth.uid());

-- comments: the same four exclusions, plus the post itself has to be readable.
drop policy if exists comments_read   on public.comments;
drop policy if exists comments_insert on public.comments;
drop policy if exists comments_update on public.comments;
drop policy if exists comments_delete on public.comments;

create policy comments_read on public.comments
  for select to authenticated using (
    not hidden
    and exists (select 1 from public.posts p where p.id = comments.post_id)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker = auth.uid() and b.blocked = comments.author)
         or (b.blocker = comments.author and b.blocked = auth.uid())
    )
    and not exists (
      select 1 from public.reports r
      where r.reporter = auth.uid() and r.comment_id = comments.id
    )
  );

create policy comments_insert on public.comments
  for insert to authenticated with check (author = auth.uid());
create policy comments_update on public.comments
  for update to authenticated using (author = auth.uid()) with check (author = auth.uid());
create policy comments_delete on public.comments
  for delete to authenticated using (author = auth.uid());

-- likes and reposts: your own rows only, in both directions. The totals come
-- from the counters on the post. See the note at the top of this file.
drop policy if exists likes_read   on public.likes;
drop policy if exists likes_write  on public.likes;
drop policy if exists likes_delete on public.likes;

create policy likes_read   on public.likes for select to authenticated using (user_id = auth.uid());
create policy likes_write  on public.likes for insert to authenticated with check (user_id = auth.uid());
create policy likes_delete on public.likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists reposts_read   on public.reposts;
drop policy if exists reposts_write  on public.reposts;
drop policy if exists reposts_delete on public.reposts;

create policy reposts_read   on public.reposts for select to authenticated using (user_id = auth.uid());
create policy reposts_write  on public.reposts for insert to authenticated with check (user_id = auth.uid());
create policy reposts_delete on public.reposts for delete to authenticated using (user_id = auth.uid());

-- follows: readable by the follower, so you can see who you follow and nobody
-- can see who follows them.
drop policy if exists follows_read   on public.follows;
drop policy if exists follows_write  on public.follows;
drop policy if exists follows_delete on public.follows;

create policy follows_read   on public.follows for select to authenticated using (follower = auth.uid());
create policy follows_write  on public.follows for insert to authenticated with check (follower = auth.uid());
create policy follows_delete on public.follows for delete to authenticated using (follower = auth.uid());

-- blocks: same shape. The blocked person is never told.
drop policy if exists blocks_read   on public.blocks;
drop policy if exists blocks_write  on public.blocks;
drop policy if exists blocks_delete on public.blocks;

create policy blocks_read   on public.blocks for select to authenticated using (blocker = auth.uid());
create policy blocks_write  on public.blocks for insert to authenticated with check (blocker = auth.uid());
create policy blocks_delete on public.blocks for delete to authenticated using (blocker = auth.uid());

-- reports: file one, never read one. Not even your own — there is nothing in a
-- report a reporter needs back, and a readable queue is a map of what is under
-- review.
drop policy if exists reports_write on public.reports;
create policy reports_write on public.reports
  for insert to authenticated with check (reporter = auth.uid());

-- ─── Photo storage ───────────────────────────────────────────────────────────
--
-- One bucket, public to read because a photo is part of a post everyone can
-- see, and writable only into a folder named after your own user id — so no
-- account can overwrite or delete another's image.
--
-- The 2MB cap is a backstop. The app downscales to a 1080px JPEG at quality
-- 0.72 before upload (lib/photo.ts), which lands well under it; this is what
-- stops someone bypassing the app and filling the bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-photos', 'post-photos', true, 2097152, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png'];

drop policy if exists post_photos_read   on storage.objects;
drop policy if exists post_photos_write  on storage.objects;
drop policy if exists post_photos_delete on storage.objects;

create policy post_photos_read on storage.objects
  for select to authenticated, anon using (bucket_id = 'post-photos');

create policy post_photos_write on storage.objects
  for insert to authenticated with check (
    bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy post_photos_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Is this username free? ──────────────────────────────────────────────────
--
-- A function rather than a select, so the app can ask about one name without
-- being able to page through the whole directory. Runs as definer for the same
-- reason: the answer is one boolean, not a row.

create or replace function public.username_available(candidate text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.reserved_usernames r where r.username = candidate::citext) then
    return false;
  end if;
  return not exists (select 1 from public.profiles p where p.username = candidate::citext);
end;
$$;

grant execute on function public.username_available(text) to authenticated, anon;

-- ─── Deleting an account ─────────────────────────────────────────────────────
--
-- Guideline 5.1.1(v): the app must be able to delete the account from inside
-- itself, not just the local copy of it. Everything below cascades from
-- auth.users, so removing that row removes the profile, the posts, the
-- comments, the follows and the blocks with it.
--
-- The photos do not cascade — storage objects are not foreign-keyed — so they
-- go first, explicitly.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  delete from storage.objects
    where bucket_id = 'post-photos'
      and (storage.foldername(name))[1] = auth.uid()::text;
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_my_account() to authenticated;

-- ─── The moderation queue ────────────────────────────────────────────────────
--
-- Run this in the SQL editor to see what is waiting. It is a view rather than a
-- saved query so it is one word to type at eight in the morning, which is the
-- difference between a 24-hour turnaround and a 72-hour one.
--
-- ─── Two things had to be said explicitly here, and were not ────────────────
--
-- A view does NOT inherit the row-level security of the tables underneath it.
-- Left alone it runs with its owner's privileges, which means it reads straight
-- past every policy in this file — so the app's own anon key could have pulled
-- the entire report queue: the reported text, who wrote it, why. Exactly the
-- leak RLS is here to prevent, through the one object that had none.
-- `security_invoker = on` makes it run as whoever is asking. An app user then
-- hits the `reports` policies, which grant no SELECT at all, and gets nothing.
--
-- The REVOKE is belt and braces on top of that: nothing in the app has any
-- business reading this, invoker rights or not.

create or replace view public.moderation_queue as
  select
    r.id            as report_id,
    r.created_at    as reported_at,
    r.reason,
    coalesce(p.body, c.body)         as content,
    coalesce(p.hidden, c.hidden)     as already_hidden,
    coalesce(pa.username, ca.username) as author,
    r.post_id,
    r.comment_id
  from public.reports r
  left join public.posts    p  on p.id = r.post_id
  left join public.comments c  on c.id = r.comment_id
  left join public.profiles pa on pa.id = p.author
  left join public.profiles ca on ca.id = c.author
  where r.resolved_at is null
  order by r.created_at;

alter view public.moderation_queue set (security_invoker = on);
revoke all on public.moderation_queue from anon, authenticated;

-- Take something down, and close every report against it, in one call:
--
--   select public.hide_post('<post id>', 'names a student');
--
-- The three moderator functions below are `security definer`, which means they
-- run with full privileges whoever calls them. Postgres grants EXECUTE on a new
-- function to PUBLIC by default — so without the REVOKE at the end of this
-- file, any signed-in teacher could call hide_post on anybody's post and empty
-- the feed. They are revoked from everyone; the SQL editor and the service key
-- are unaffected, because they are not bound by grants.

create or replace function public.hide_post(target uuid, why text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts set hidden = true, hidden_reason = why where id = target;
  update public.reports set resolved_at = now() where post_id = target and resolved_at is null;
$$;

create or replace function public.hide_comment(target uuid, why text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.comments set hidden = true where id = target;
  update public.reports set resolved_at = now() where comment_id = target and resolved_at is null;
$$;

-- Nothing wrong with it: close the reports and leave it up.
create or replace function public.dismiss_report(target uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.reports set resolved_at = now() where id = target;
$$;

-- ─── Nobody but a moderator may call these ───────────────────────────────────
--
-- Postgres hands EXECUTE on a new function to PUBLIC unless told otherwise, and
-- all three of these are `security definer`. Revoking is what makes them
-- moderator-only rather than a vandalism button behind the app's public key.
--
-- `username_available` and `delete_my_account` are deliberately left granted:
-- the first returns one boolean, and the second can only ever delete the caller
-- (see the auth.uid() guard inside it).

revoke all on function public.hide_post(uuid, text) from public, anon, authenticated;
revoke all on function public.hide_comment(uuid, text) from public, anon, authenticated;
revoke all on function public.dismiss_report(uuid) from public, anon, authenticated;
