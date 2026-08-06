# Turning the server on

Right now Here has no server. Every phone is an island: a tester's posts are
written to their own device and stay there, and the feed everyone scrolls is the
same six sample posts. Nobody can see anybody.

This page turns that into a real shared feed.

It is written for someone who has never used a database and does not want to
learn. Every step is a thing to click or a thing to paste. Where you have to
type a command, the exact command is here — you never have to write one.

**About 90 minutes.** Roughly half of it is waiting.

You will need: a web browser, and the `.p8` file Apple gave you (for the last
step only). No Mac required. No Terminal on your own computer required.

---

## What will and will not leave the phone

Worth reading once before you start, because it is the decision everything else
was built around.

**Goes to the server:** what a teacher publishes. Posts, the photo on a post,
comments, who they follow, who they blocked, what they reported, and the byline
under their name.

**Stays on the phone, always:** the daily check-ins and the self-care list.
There is no table that could hold them. That is what makes the line on the
sign-up screen true — *"Your check-ins on Here are 100% private."*

**Unavoidable:** the work email address. It is what a code gets sent to and what
signing in again is matched against. Every email sign-in on earth needs it.

---

# Part 1 — Make the database

## Step 1. Create the Supabase account

1. Go to **https://supabase.com**
2. Click **Start your project** (top right).
3. Sign up with **`hello@tendedcollective.com`** — not a personal address. This
   is a company asset and one day somebody else may need to get into it.
4. Confirm the email it sends you.

## Step 2. Create the project

1. You will land on a dashboard. Click **New project**.
2. If it asks for an organization first, name it **`Tended Collective`** and
   pick the **Free** plan for now.
3. Fill in:
   - **Name:** `here-production`
   - **Database Password:** click **Generate a password**, then copy it into
     your password manager immediately. There is no way to recover this later.
     You will probably never need it, but if you do, you really do.
   - **Region:** **East US (North Virginia)** unless most of your teachers are
     out west, in which case **West US (Oregon)**. This is just about speed.
4. Click **Create new project**.
5. **Wait about two minutes.** The page will say it is setting up. Do not close
   the tab.

## Step 3. Get the database file onto your clipboard

This is the file that creates all the tables. You do not need to understand it —
you need to copy it exactly, all 640 lines.

1. Open a **brand new browser tab** (Cmd+T / Ctrl+T).
2. Type this into the **address bar at the very top of the browser** — the one
   with the padlock, not any box inside a web page:

   **github.com/Tended-Collective/here-app/blob/main/here-app/supabase/schema.sql**

3. You will see the file with line numbers down the left side, starting
   `-- Here — database schema.` That is correct. It is meant to look like that.
4. At the **top right of the file box** there is a row of small icons. Click the
   one that looks like **two overlapping squares**. Hovering over it says
   **Copy raw file**.

That is the whole file on your clipboard, in one click. Do not copy anything
else before the next step.

> **If you get "404 - page not found"** and the message mentions a *path* that
> starts with `github.com` or `raw.githubusercontent.com`, the address went into
> a box **inside** GitHub rather than the browser's address bar. GitHub has a
> file-search box that looks like somewhere you would paste a link; anything
> pasted there is treated as a filename to hunt for. Open a fresh tab and put
> the address in the bar at the very top of the window.
>
> **If the error names `teacherapp`,** you are in the old repository. It was
> archived when everything moved to **here-app**. Check the name at the top of
> the page.
>
> The repository is public, so this needs no sign-in at all — if you are stuck,
> try it in a private browsing window to rule out your GitHub session.

## Step 4. Run it

1. Go back to your Supabase tab.
2. In the left sidebar, click the **SQL Editor** icon (it looks like a database
   cylinder with `SQL` on it). If the sidebar is collapsed to icons only, hover
   to see the names.
3. Click **New query** (top left of that panel).
4. Click into the big empty text area.
5. Press **Cmd + V** / **Ctrl + V** to paste.
6. Click the green **Run** button (bottom right of the editor). You can also
   press **Cmd + Enter** / **Ctrl + Enter**.

**What you should see:** a green bar saying **Success. No rows returned.**

That is exactly right. It built tables rather than reading any, so there are no
rows to return.

> **If you see a red error instead:** do not try to fix it. Click the error to
> select it, copy the whole message, and send it to Claude. This file has never
> been run against a real Supabase project, so an error here is expected to be
> my problem, not yours.

## Step 5. Check it worked

1. In the left sidebar, click **Table Editor**.
2. You should see a list of tables down the left: `blocked_domains`, `blocks`,
   `comments`, `follows`, `likes`, `posts`, `profiles`, `reports`,
   `reserved_usernames`, `reposts`.

Ten tables. If they are there, the database is done.

---

# Part 2 — Make the emails work

## Step 6. Change what the code email says

> **Do Step 8 before this one.** Supabase keeps the email templates read-only
> while a project is still sending through their shared service — the boxes
> below are greyed out until custom SMTP is configured. Set up Resend first,
> save the SMTP settings, then come back here and the fields will open.
>
> The order in this file is left as-is because it is the order the pieces make
> sense in, not the order the dashboard allows.

This matters more than it sounds. The one thing this design cannot hide is that
a district's mail server sees a message arrive. So the message must give nothing
away about what the app is for.

**Two templates, not one.** Supabase picks by who is asking: a brand-new address
gets **Confirm signup**, an address that has signed in before gets **Magic
Link**. Change only one and half your users receive a clickable link instead of
a code — and the half that breaks is new sign-ups, which at the start of a pilot
is everybody.

1. Left sidebar → **Authentication**.
2. In the sub-menu, click **Emails**.
3. Do everything below for **Confirm signup**, then repeat it for **Magic Link**.
4. There is a **Subject heading** box. Delete what is in it and paste exactly:

   ```
   Your Here code is {{ .Token }}
   ```

5. Below that is a **Message body** box with HTML in it. Delete **all** of it
   and paste exactly:

   ```html
   <p>Your Here code is <strong>{{ .Token }}</strong></p>
   <p>It expires in 10 minutes. If you did not ask for it, ignore this email.</p>
   ```

6. Click **Save changes** — then go back and do the other template.

`{{ .Token }}` is the bit that turns this into a six-digit code instead of a
clickable link. **This step is not optional.** Left alone, Supabase sends a
magic link, the app's screen asks for six digits, and sign-up cannot complete —
codes will appear to arrive and then not work.

**Never put the words wellness, burnout, mental health, therapy or check-in in
that subject line.** Not to deceive an employer — the teacher is the person
being protected, and the subject line is the part a district reads.

## Step 7. Turn on code sign-in

1. Still under **Authentication**, click **Sign In / Providers**.
2. Find **Email** in the list and click it.
3. Make sure **Enable Email provider** is on.
4. Make sure **Confirm email** is on.
5. Find **Email OTP Expiration** and set it to **600** (that is 10 minutes, to
   match what the email says).
6. Click **Save**.

## Step 8. Send mail from your own domain

Supabase's built-in email is capped at a few messages an hour and comes from a
shared address that school spam filters distrust. **Skip this and your testers
will not get their codes.**

1. Go to **https://resend.com** and sign up (free up to 3,000 emails a month).
2. Click **Domains** → **Add Domain** → type `tendedcollective.com` → **Add**.
3. Resend shows you three records. Add them wherever `tendedcollective.com` is
   registered — for Tended Collective that is **Squarespace**: log in →
   **Settings** → **Domains** → click the domain → **DNS** → **Custom records**
   → **Add record**, one per row below.

   | Type | Name | Priority | Value |
   |---|---|---|---|
   | TXT | `resend._domainkey` | leave blank | the long `p=MIGfMA…QIDAQAB` string |
   | MX | `send` | `10` | `feedback-smtp.….amazonses.com` |
   | TXT | `send` | leave blank | `v=spf1 include:amazonses.com ~all` |

   **Copy each value from Resend with its copy button — do not retype them.**
   Resend shows them shortened with `[…]` in the middle; a DKIM key is around
   200 characters and one wrong character means it never verifies.

   Leave **Enable Receiving** switched off in Resend. Nothing needs to arrive
   through it, and switching it on only adds more records to keep correct.

   Three things that look wrong in Squarespace and are not:

   - **TTL is stuck at 30 minutes.** Resend says "Auto", which only means "your
     provider's default". TTL controls how long other servers cache the record.
     It has no bearing on whether it works.
   - **Priority is a dash on the TXT rows.** Only MX records have a priority.
     The box appears when you pick MX; that is where the `10` goes.
   - **It will not disturb your existing mail.** Every record sits on a
     subdomain — `resend._domainkey` and `send` — so whatever delivers to
     `hello@tendedcollective.com` today is untouched. That separation is the
     reason Resend uses a `send` subdomain at all.
4. Back in Resend, click **Verify**. It can take anywhere from five minutes to
   an hour. Go and do something else; come back and press it again.
5. Once it says Verified, go to **API Keys** → **Create API Key** → name it
   `here-supabase` → copy the key it gives you.
6. Back in Supabase: **Project Settings** (the gear, bottom left) →
   **Authentication** → scroll to **SMTP Settings** → toggle **Enable Custom
   SMTP**.
7. Fill in:
   - **Sender email:** `here@tendedcollective.com`
   - **Sender name:** `Here`
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **Username:** `resend`
   - **Password:** the API key you just copied
8. Click **Save**.

### Raise the sending limit

Supabase caps how many auth emails a project may send per hour, and the default
is set for their shared service — small enough that the third person to sign up
in an afternoon is simply refused.

**Authentication** → **Rate Limits** → find the per-hour email limit and set it
to at least **100**. You are paying Resend for the capacity; there is no reason
to keep Supabase's training wheels on.

Separately there is a fixed **one email per address per minute** cooldown. That
one cannot be changed and does not need to be — the app names the remaining wait
rather than telling people to try again, which is what it used to do.

### Prove the mail works before building anything

A 25-minute build is a slow way to discover that email is broken.

1. Supabase → **Authentication** → **Users** → **Add user** → **Send
   invitation**, to your own address.
2. Check it arrives. Check junk too.
3. Open Resend → **Emails**. Every message it attempted is listed with a status.
   **Delivered** is what you want. **Bounced**, or no row at all, means the SMTP
   settings are wrong — and Resend usually says which part.

That page stays the first place to look for anything email-related.

---

# Part 3 — Tell the app where the database is

## Step 9. Copy the two keys

1. In Supabase: **Project Settings** (gear, bottom left) → **API Keys**.
2. You need two things. Paste each into a scratch note as you go:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`. If it is not
     on this page it is on the neighbouring **Data API** one.
   - the **publishable key** — starts `sb_publishable_`

> **Take the publishable key, not the secret key.** The secret one bypasses
> every security rule you just installed. It must never go in the app, in the
> repository, in an email, or in a chat message. It stays on this page.

> **On the names.** Supabase renamed these. Anywhere you read *anon key*, that
> is now the **publishable key**; *service_role* is now the **secret key**. The
> old anon key was a long JWT starting `eyJ`, the new one starts
> `sb_publishable_`. Either format works — `src/lib/backend.ts` accepts both,
> and the client library recognises the new prefixes.

## Step 10. Open a place to type commands

The last few steps need a command line. You do not need one on your own
computer — GitHub gives you one in the browser.

1. Go to **https://github.com/Tended-Collective/here-app**
2. Click the green **Code** button.
3. Click the **Codespaces** tab.
4. Click **Create codespace on main**.
5. Wait one to two minutes. A code editor opens in your browser.
6. At the bottom of that editor there is a panel with a tab called **TERMINAL**.
   Click it. If you do not see it, press **Ctrl + `** (the backtick key, above
   Tab), or use the menu: **☰** → **Terminal** → **New Terminal**.

Everything below gets typed — or pasted — into that black panel, one line at a
time, pressing **Enter** after each.

7. First, move into the app folder. Paste this and press Enter:

   ```
   cd here-app
   ```

## Step 11. Sign in to Expo

1. Go to **https://expo.dev** in another tab, sign in, click your avatar (top
   right) → **Access Tokens**.
2. **Delete the existing token** — it was visible in a screenshot months ago and
   should not be trusted.
3. Click **Create token**, name it `codespace`, and copy the value.
4. Back in the Codespace terminal, paste this — replacing `PASTE_TOKEN_HERE`
   with what you just copied — and press Enter:

   ```
   export EXPO_TOKEN=PASTE_TOKEN_HERE
   ```

   Nothing will appear to happen. That is correct.

## Step 12. Hand over the two Supabase keys

Paste each of these in turn, replacing the bracketed part with the value from
Step 9. Press Enter after each.

```
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value https://YOURPROJECT.supabase.co
```

```
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value sb_publishable_...
```

The first time you run `npx eas-cli` it will ask to install something — answer
**y** and press Enter.

Each command should print a line confirming the secret was created. You can
check them any time with:

```
npx eas-cli secret:list
```

## Step 13. Build it

```
npx eas-cli build --platform ios --profile production
```

It will ask a few questions. Press Enter to accept the defaults unless it asks
something you recognise. Then it uploads and builds on Apple's machines — **this
takes 15 to 25 minutes.** You can close the browser tab; the build carries on.
The terminal prints a link where you can watch it.

## Step 14. Send it to TestFlight

You need the `.p8` file from Apple for this — the one you were told to save
because it can only be downloaded once.

1. In the Codespace, find the file list on the **left-hand side** of the editor.
   If you cannot see it, click the top icon in the far-left strip (it looks like
   two sheets of paper).
2. **Drag the `.p8` file from your computer** onto that file list, dropping it
   inside the `here-app` folder. It will upload. It is already excluded from the
   repository, so it cannot be committed by accident.
3. In the terminal, paste these three lines one at a time, replacing
   `YOUR_FILE.p8` with the file's actual name:

   ```
   export EXPO_ASC_API_KEY_PATH=/workspaces/here-app/here-app/YOUR_FILE.p8
   ```
   ```
   export EXPO_ASC_KEY_ID=Q7268QMN7R
   ```
   ```
   export EXPO_ASC_ISSUER_ID=a1ca6f53-0aca-46a5-802b-35c9ca071633
   ```

4. Then:

   ```
   npx eas-cli submit --platform ios --profile production
   ```

5. Wait 10–30 minutes, then look in App Store Connect → **TestFlight**. The
   build appears there when Apple has finished processing it.

---

# Part 4 — Check it actually worked

Do this yourself before you tell any tester anything.

1. Install the new TestFlight build on your phone.
2. Sign up with a real school email address.
3. **Does a code arrive?** If not, the problem is Step 6, 7 or 8. Check your
   junk folder first.
4. Post something.
5. Get **one** person you trust to install it and sign up.
6. **Can they see your post? Can you see theirs?**

If yes: it is done. That is the whole thing working.

Only then invite everyone else.

## One more thing before real testers

Supabase's free plan switches your database off after a week of no activity —
which will happen the first quiet weekend, and your testers will open the app to
an error.

**Project Settings → Subscription → upgrade to Pro, $25/month.** Do this before
you invite anyone whose opinion you care about.

---

# Moderating, once you are live

Apple requires reported content to come down within 24 hours of a report.
Reports arrive in the database, not your inbox, so this has to be a habit.

Once a day: Supabase → **SQL Editor** → **New query** → paste and Run:

```sql
select * from moderation_queue;
```

Empty result = nothing waiting. Most days.

If something is waiting, you will see the text, who wrote it, and why it was
flagged. Copy the `post_id` from the row, then run one of these:

```sql
select hide_post('paste-the-post_id-here', 'names a student');
```
```sql
select hide_comment('paste-the-comment_id-here', 'harassment');
```
```sql
select dismiss_report('paste-the-report_id-here');
```

Hiding removes it for everyone immediately. Dismissing leaves it up and closes
the report.

The person who reported it stopped seeing it the moment they reported it, so
nobody is stuck staring at the thing they objected to while they wait for you.

---

# What is wired up, and what is not

Honest status, because the difference matters.

**Working against the server** once the steps above are done:

- Real six-digit codes, sent and checked
- Personal email addresses refused — enforced by the database, so it cannot be
  bypassed by anyone poking at the app
- Usernames checked against the real directory
- **The feed.** One tester's post appears on another tester's phone. This is the
  thing the whole exercise was for.
- Posting, editing, deleting; likes and reposts; following; blocking; reporting;
  photos; profile edits; account deletion

**Still local, and staying that way:** the daily check-ins and the self-care
list.

**Not finished yet:**

- **Comment threads.** Writing a comment reaches the database, but the sheet
  still lists sample replies instead of loading the real ones.
- **Paging.** The feed loads the 30 most recent posts. The "See earlier today"
  button is hidden when there is a server, because there is nothing behind it
  yet. Fine for a pilot; needs doing before the feed gets busy.

---

# What it costs

| | |
|---|---|
| Supabase Pro | $25/month |
| Resend | Free to 3,000 emails/month |
| Apple Developer | $99/year, already paid |

About **$25/month** until you are into thousands of users.

---

# If something goes wrong

Send Claude the exact error text — copy and paste it, do not retype or
summarise. Say which step number you were on. Almost everything here fails in a
way that names its own cause, and the message is the fastest route to a fix.

The one thing not to do is guess at the SQL in Step 4. It is 640 lines of
security rules, and a well-meant edit is how a database ends up letting one
teacher read another's private data.
