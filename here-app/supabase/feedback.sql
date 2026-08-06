-- Pilot feedback.
--
-- Run this once in the Supabase SQL editor, the same way as schema.sql. It is
-- separate from that file on purpose: the pilot form is temporary, and when it
-- is over this table can be dropped without touching anything the app depends
-- on.
--
-- ─── Write-only, from anywhere ───────────────────────────────────────────────
--
-- The form lives on tendedcollective.com, not in the app, so whoever submits it
-- is `anon` — not signed in, no account, no auth.uid(). The policy therefore
-- allows an insert from anyone and a read from nobody.
--
-- That asymmetry is the whole design. Answers can go in from a public web page;
-- getting them out needs the SQL editor, which runs as the service role. Nobody
-- can enumerate what other teachers said, and nor can anyone who pulls the key
-- out of the page source — which they can, because it is printed in it.
--
-- ─── The spam surface, stated plainly ────────────────────────────────────────
--
-- A public insert endpoint can be hammered. There is no captcha here and no
-- server-side rate limit, because for a pilot of a few dozen invited teachers
-- the cost of one is not worth paying. What there is instead: every text field
-- is length-capped, at least one real answer is required, and a hidden field
-- that a human never fills in but a naive bot does.
--
-- If it does get hit, the fix is `alter table public.feedback disable row level
-- security` — no, the fix is to drop the insert policy, which closes the form
-- in one statement while leaving the answers already collected intact.

create table if not exists public.feedback (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  -- Who is answering. Every one optional; a blank pilot survey is still useful.
  role          text,
  device        text,

  -- Did it work.
  code_arrived  text,
  broke         text,
  confusing     text,

  -- Did they use it.
  days_used     text,
  what_stopped  text,
  posted        text,
  feed_worth    text,

  -- What is missing.
  wanted        text,
  would_miss    text,

  -- Money, last on purpose.
  who_pays      text,
  paid_before   text,
  worth_paying  text[],

  -- Only if they choose to leave it. The form says it is optional and says why.
  contact       text,

  constraint lengths check (
    coalesce(length(role), 0) <= 60
    and coalesce(length(device), 0) <= 60
    and coalesce(length(code_arrived), 0) <= 60
    and coalesce(length(broke), 0) <= 4000
    and coalesce(length(confusing), 0) <= 4000
    and coalesce(length(days_used), 0) <= 40
    and coalesce(length(what_stopped), 0) <= 4000
    and coalesce(length(posted), 0) <= 4000
    and coalesce(length(feed_worth), 0) <= 4000
    and coalesce(length(wanted), 0) <= 4000
    and coalesce(length(would_miss), 0) <= 4000
    and coalesce(length(who_pays), 0) <= 80
    and coalesce(length(paid_before), 0) <= 4000
    and coalesce(length(contact), 0) <= 200
    and coalesce(array_length(worth_paying, 1), 0) <= 12
  ),

  -- An entirely empty submission is somebody's stray click, or a bot.
  constraint says_something check (
    coalesce(length(broke), 0) + coalesce(length(confusing), 0)
    + coalesce(length(what_stopped), 0) + coalesce(length(posted), 0)
    + coalesce(length(feed_worth), 0) + coalesce(length(wanted), 0)
    + coalesce(length(would_miss), 0) + coalesce(length(paid_before), 0)
    + coalesce(length(days_used), 0) + coalesce(length(who_pays), 0)
    + coalesce(length(code_arrived), 0) > 0
  )
);

alter table public.feedback enable row level security;

/*
 * The grant, which is separate from the policy and easy to forget.
 *
 * A policy says *which rows* a role may touch. A grant says whether the role
 * may touch the table at all, and Postgres gives new tables no grants. Supabase
 * papers over this with default privileges on the public schema, so a table
 * created there often appears to work without one — which is exactly how a
 * schema ends up depending on a setting nobody wrote down. Stated here instead.
 *
 * Insert only. No select, for anyone.
 */
grant insert on public.feedback to anon, authenticated;

drop policy if exists feedback_write on public.feedback;
create policy feedback_write on public.feedback
  for insert to anon, authenticated with check (true);

-- No select policy, deliberately. Reading is the SQL editor's job.

-- ─── Reading the answers ─────────────────────────────────────────────────────
--
--   select * from public.feedback order by created_at desc;
--
-- Or the two summaries most worth having:
--
--   select who_pays, count(*) from public.feedback
--     where who_pays is not null group by who_pays order by count(*) desc;
--
--   select unnest(worth_paying) as feature, count(*) from public.feedback
--     group by feature order by count(*) desc;

create or replace view public.feedback_summary as
  select
    count(*)                                              as responses,
    count(*) filter (where code_arrived = 'never')        as code_never_arrived,
    count(*) filter (where code_arrived = 'junk')         as code_in_junk,
    count(*) filter (where nullif(broke, '') is not null) as reported_something_broken,
    count(*) filter (where who_pays = 'school')           as says_school_should_pay,
    count(*) filter (where who_pays = 'me')               as says_they_would_pay,
    count(*) filter (where who_pays = 'free')             as says_it_should_be_free
  from public.feedback;

revoke all on public.feedback_summary from anon, authenticated;

-- Closing the form when the pilot ends, without losing the answers:
--
--   drop policy feedback_write on public.feedback;
