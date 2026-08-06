# The browser version, and the pilot survey

Testers were getting stuck on TestFlight. Apple's invite flow asks a teacher to
install a second app, accept an invitation from an email that often lands in
junk, and trust a build labelled as unreleased. Some of them never got through
it, and a tester who cannot open the app has no opinion to give us.

So there is now a link. One page, no install, the real app running in the
browser, and the survey underneath it.

**It does not replace TestFlight.** The browser cannot show us whether the app
survives a real week on a real phone — nothing is saved past the browser, there
is no notification, and no code is emailed. It answers a different question:
what do people think of it when they see it. Both are worth having.

---

## What gets built

```
try/
  index.html   the page — intro, the app in a phone frame, the survey   (~500KB)
  app.html     the app itself, everything inside it                     (~2.4MB)
```

Two ordinary files that reference each other and nothing else. No server, no
build step on the host, no database except the one the survey posts to. Drop the
folder on any static host and it works.

To rebuild:

```
python3 web/build-try.py --key=sb_publishable_...your key...
```

Leave `--key` off and everything still builds, but the survey will say *"This
form is not connected yet"* rather than pretending to send. Add `--skip-export`
when you have only changed the page and not the app — it saves about ninety
seconds.

### The demo has no backend in it, on purpose

The export runs with the Supabase variables stripped out. That is what makes
any six digits open the app, and it is what keeps a stranger poking at a public
page out of the pilot's real database. The build checks the finished file for a
project URL or a key afterwards and refuses to write anything if it finds one —
a demo that quietly kept the backend is the one failure here that would matter.

---

## Before it can collect anything

**Run `supabase/feedback.sql`.** Same as `schema.sql`: Supabase → SQL Editor →
New query → paste the whole file → Run. It creates the table the survey posts
to. Until it exists every submission fails.

That table is deliberately lopsided: anyone can put an answer in, nobody can
read one back. The key sitting in the page grants nothing beyond the insert, so
a tester who views the page source still cannot see what other teachers wrote.

---

## Where to host it

**Not Squarespace.** Squarespace will not host an HTML file — its file uploads
are for PDFs and images — and its Code Blocks need a Business plan and could not
hold a 2.4MB file anyway. Squarespace's job here is the link.

**Not GitHub Pages either.** This repository is private, and Pages on a private
repository needs a paid GitHub plan.

### Netlify Drop — the short way

1. Download the `try` folder to your computer. In the Codespace file list,
   right-click the folder → **Download**.
2. Go to **app.netlify.com/drop**.
3. Drag the whole `try` folder onto the page.
4. It gives you a URL within a few seconds, something like
   `https://cheerful-pastry-1a2b3c.netlify.app`. That is the link.
5. Sign in when it offers — with a free account you can rename the site to
   something a teacher will not mistype, like `try-here.netlify.app`, and
   re-drag the folder later when the app changes.

### Then, on Squarespace

Add a button — *"Try it in your browser →"* — pointing at that URL. A link, not
an embed. An embed would put a phone inside a page inside a page, and a teacher
opening it on their own phone would be scrolling three things at once.

Send testers straight to that link. If TestFlight worked for them, they can do
both; the survey asks which they used.

---

## What the survey asks

Five short sections, every question skippable, no name attached:

| | |
|---|---|
| **Did anything break?** | What broke, what was confusing, and whether the sign-up code arrived — the one question that only a phone tester can answer. |
| **Did you use it?** | Days checked in, what got in the way on the other days, whether they posted, whether the feed was worth reading. |
| **What's missing?** | What they wanted and couldn't do. And: if Here vanished tomorrow, what would you miss? |
| **Who should pay for this?** | Who should cover it, what they have paid for their own wellbeing before, and which features would be worth paying for. |
| **About you** | Role, phone, and an optional email if they are happy to be asked more. |

The money section is last on purpose. Asking it first tells people the survey is
about money and colours everything above it.

### Reading the answers

Supabase → SQL Editor:

```sql
select * from public.feedback order by created_at desc;
select * from public.feedback_summary;
```

The second one is the count of responses, how many said the code never arrived,
how many reported something broken, and the split on who should pay.

### Closing it when the pilot ends

```sql
drop policy feedback_write on public.feedback;
```

One statement. The form stops accepting submissions; everything already
collected stays where it is.

---

## What is not defended against

A public form with no captcha can be spammed. For a pilot of a few dozen
invited teachers that is not worth a captcha's friction, so what stands in the
way instead is: every field length-capped, at least one real answer required,
and a hidden field a person never sees and a naive bot fills in. If it does get
hit, the one statement above closes the form.
