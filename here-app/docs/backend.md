# Turning the server on

Right now Here has no server. Every phone is an island: a tester's posts are
written to their own device and stay there, and the feed everyone scrolls is the
same six sample posts written into `src/data/mock.ts`. Nobody can see anybody.

This page turns that into a real shared feed. It is written for someone who has
never used a database. Nothing below needs a Mac, a terminal, or code.

**Roughly 40 minutes**, most of it waiting for things to save.

---

## What will and will not leave the phone

Worth reading before you start, because it is the decision everything else was
built around.

**Goes to the server:** what a teacher publishes. Posts, the photo on a post,
comments, who they follow, who they blocked, what they reported, and the byline
under their name — display name, username, role, level, state, years.

**Stays on the phone, always:** the daily check-ins and the self-care list.
There is no table that could hold them. That is what makes the line on the
sign-up screen true — *"Your check-ins on Here are 100% private"* — and it is
why the schema is shaped the way it is.

**Unavoidable:** the work email address. It is what a code gets sent to and what
signing in again is matched against; any email sign-in needs it. It sits in
Supabase's own private `auth.users` table and is never copied anywhere the feed
can reach.

---

## 1. Make the project

1. Go to **supabase.com** and sign up. Use `hello@tendedcollective.com`, not a
   personal address — this is a company asset and somebody else may need it one
   day.
2. **New project.**
   - **Name:** `here-production`
   - **Database password:** press Generate, then save it in your password
     manager. You will almost never need it, and there is no way to recover it.
   - **Region:** `East US (North Virginia)` if your teachers are mostly on the
     east coast. Pick the one closest to most of them; it is the difference
     between the feed feeling instant and feeling sluggish.
   - **Plan:** Free is genuinely fine to start. It pauses a project after a week
     with no activity, which is a problem for a pilot with real users, so move
     to Pro ($25/month) before you invite anyone who matters.
3. Wait. It takes about two minutes to build.

## 2. Create the tables

1. Left sidebar → **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this repository. Copy **all** of it.
3. Paste it into the editor and press **Run**.

You should see *Success. No rows returned.* That is right — it built tables
rather than reading any.

It is safe to run again later if the file changes; everything in it is written
to be re-runnable.

### What you just created

Ten tables and a set of access rules called Row Level Security. The rules are
the important part and they run inside the database, not in the app — so they
hold even against someone who pulls the app apart and talks to the database
directly, which is a thing that will happen eventually.

Two of them are deliberately stricter than you might expect:

- **Nobody can see who liked a post.** The number under the heart is a counter;
  the list of who is behind it is readable only by the person who tapped. In an
  app where posts are "here is how I coped this week", a colleague being able to
  read who quietly agreed is a real harm.
- **Nobody can see who follows them.** Same reasoning, and the app has never
  shown a follower count.

## 3. Make the code email look right

This matters more than it sounds. The one thing this design cannot hide is that
a district's mail server sees a message arrive. So the message must give nothing
away.

1. **Authentication** → **Emails** → **Magic Link** template.
2. Replace the whole body with:

   ```html
   <p>Your Here code is <strong>{{ .Token }}</strong></p>
   <p>It expires in 10 minutes. If you did not ask for it, ignore this email.</p>
   ```

   `{{ .Token }}` is what makes it a six-digit code instead of a link. The app's
   screens are built for a code, so this substitution is required, not cosmetic.
3. Set the **subject** to exactly:

   ```
   Your Here code is {{ .Token }}
   ```

**No mention of wellness, burnout, mental health, therapy or check-ins** — in
the subject, the body, or the sender name. Not to deceive an employer: the
subject line is the part of this a district actually reads, and the teacher is
the person being protected.

4. **Authentication** → **Sign In / Providers** → **Email**: confirm **Email
   OTP** is on and set the expiry to **600** seconds.

## 4. Send mail from your own domain

Supabase's built-in mail is capped at a handful of messages an hour and sends
from a shared address that school spam filters distrust. Skip this and your
testers will not receive codes.

1. Sign up at **resend.com** (free to 3,000/month) and verify
   `tendedcollective.com` by adding the DNS records it gives you.
2. In Supabase: **Project Settings** → **Authentication** → **SMTP Settings** →
   enable, and paste Resend's host, port, username and password.
3. **Sender email:** `here@tendedcollective.com`. **Sender name:** `Here`.

Then send yourself a code from a real phone and check it does not land in junk.

## 5. Give the app the keys

1. **Project Settings** → **API**. You need two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long string starting `eyJ`

   Take the **anon** key. The one labelled `service_role` bypasses every access
   rule in step 2; it must never go in the app, in this repository, or in an
   email. It stays in the dashboard.

2. Tell the build about them. In a terminal, in the `here-app` folder:

   ```
   npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value https://YOURPROJECT.supabase.co
   npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value eyJ...
   ```

3. Build and submit as usual:

   ```
   npx eas-cli build --platform ios --profile production
   npx eas-cli submit --platform ios --profile production
   ```

That is the switch. `src/lib/backend.ts` looks for exactly those two variables:
both set, the app uses the server; either missing, it behaves exactly as it does
today. There is no half-on state.

The App Store privacy declaration follows the same two variables — see
`app.config.js`. A build with a server automatically declares that it collects
an email address, user content and a user id. You do not have to remember to
change it, which is the point.

> **If you ever build on your own laptop:** after setting those variables you
> must pass `--clear` the first time (`npx expo export --platform web --clear`).
> The bundler caches translated files and will otherwise happily produce a build
> that ignores them. EAS builds start from an empty container, so this only
> bites locally. It bit during development, which is why it is written down.

---

## Moderating

Apple's guideline 1.2 requires objectionable content to be removed within 24
hours of a report. Reports arrive in the database, not in your inbox, so this
has to be a habit.

**SQL Editor**, once a day:

```sql
select * from moderation_queue;
```

Anything waiting shows the reported text, who wrote it and why it was flagged.
Then either:

```sql
select hide_post('<the post_id>', 'names a student');
select hide_comment('<the comment_id>', 'harassment');
select dismiss_report('<the report_id>');   -- nothing wrong with it
```

Hiding removes it for everybody, immediately. Dismissing leaves it up and closes
the report.

The person who reported something stops seeing it the moment they report it,
without waiting for you — so nobody is stuck looking at the thing they just
objected to.

---

## What is wired up, and what is not

Honest status, because the difference matters.

**Working against the server** once configured:

- Sending a real six-digit code, and checking it
- Refusing personal email domains — enforced by the database, not just the app
- Checking whether a username is free, against the real directory
- **The feed itself.** Posts come from the database, not from `mock.ts`, and one
  tester's post appears on another tester's phone. This is the thing the whole
  exercise was for.
- Posting, editing and deleting; likes and reposts; following; blocking;
  reporting; photo upload; profile edits; account deletion

**Still local, and staying that way:** the daily check-ins and the self-care
list, exactly as promised.

**Not yet wired:** comment threads. Posting a comment reaches the database, but
the sheet still lists the sample replies from `mock.ts` rather than loading the
real ones. Everything else on a post is live.

Also not built: paging. The feed loads the most recent 30 posts and the "See
earlier today" button is hidden when there is a server, because there is nothing
behind it yet. That is fine for a pilot and needs doing before the feed is busy.

---

## What it will cost

- **Supabase Pro** — $25/month. The free tier pauses after a week of inactivity,
  which you cannot have with real testers.
- **Resend** — free to 3,000 emails a month. One code per sign-in.

Roughly $25/month until you are into thousands of users.
