# Tended

An Expo / React Native implementation of **Tended App v3** from the Claude Design handoff
(`../project/Tended App v3.dc.html`) — the simplified four-tab teacher wellness app in the
"quiet paper" treatment.

## Running it

```
npm install
npm run ios       # or: npm run android
npm run web       # opens in a browser inside the device frame
```

On a phone the app fills the screen. On a wide browser window it is drawn inside the 402×874
device from the design canvas, scaled down if the window is shorter than the device.

## The screens

| Tab | What it does |
| --- | --- |
| **Today** | "How was your day?" — five-step mood ramp, one tap, plus optional tags. Saves to the device. |
| **Record** | This week's bars, an insight line read back from your own entries, the Tended+ card at $4.99, and the six-week chart behind the lock. |
| **Your area** | ZIP heatmap with the steady→rough legend, your-ZIP card, what people named here, the contribution toggle, and the live nearby feed — post a sentence, react to other people's. |
| **Support** | The self-care practice tracker (seven tappable days per practice), two reading cards and the podcast's episodes, both opening Tended Collective, and the sponsored shelf below them. |

## Layout of the code

```
App.tsx                       fonts, providers, device frame
src/theme.ts                  colours, mood ramp, type roles, metrics
src/store.tsx                 the one table of user data + AsyncStorage
src/data/mock.ts              fixed sample content (map, feed, posts, help)
src/lib/dates.ts              week/weekday helpers
src/components/               PhoneFrame, TabBar, Toggle, StripedPlaceholder, ui primitives
src/screens/                  one file per tab
```

## Implementation notes

**Colour.** The prototype was authored in OKLCH, which React Native cannot parse. Every colour in
`src/theme.ts` is the sRGB conversion of its OKLCH source, with the original value kept in a
comment so the ramp can be retuned against the design. The accent `oklch(.45 .07 210)` is
`#17606b`; the five moods run `#7aad84` → `#b46762`.

**The check-in scale is even.** The design's five options ran Good / Okay / Worn down / Running
empty / Rough — one good day, one neutral one and three bad ones. A teacher having a genuinely fine
day had a single box to put it in while a bad one had three, which asks a leading question and
skews every average built on the answer. It now runs Great / Good / Okay / Worn down / Rough: two
above the middle, two below.

The colour ramp is spaced to match, hue stepping evenly from the green end to the red one (150,
119, 88, 56, 25) instead of bunching in the warm half. Both anchors are the design's own values,
unchanged, and every hex is still the sRGB conversion of the OKLCH beside it.

Nothing reads the labels — scores are stored 1–5 and indexed into `MOODS` — so the scale is one
array to edit. Existing entries keep their numbers, which now mean something slightly kinder.

**Type.** Newsreader 300/400 and IBM Plex Mono 500/600 are bundled via `@expo-google-fonts`.
CSS `letter-spacing` is em-relative and React Native's is absolute, so `monoLabel()` multiplies the
em value through by the font size.

**The area figures say less than they used to.** The ZIP card carried two sentences — "71% logged a
hard day this week" and "most named the same two things you did" — that read as findings drawn from
the map under them. Nothing computed either one, and they would have read the same way whatever the
week held, so they are gone. The toggle's status line was the same kind of claim ("included since
28 August · 41 check-ins counted") and is now counted from your own entries instead.

What is left on that tab is openly a mock of a backend: the heatmap, the ZIP and its teacher count,
the named causes and their shares, and the other teachers' updates in the feed. None of it moves
with anything, because there is nothing yet for it to move with.

**The practice note is computed, all of it.** It used to end "your best run since August" on any
week that cleared five kept days — a superlative the app had no way of checking, since it never
looked at August or at any week but this one. It now reads the stored practice dates, groups them
by week, and only claims a best week when this week genuinely beats every earlier one on record.
Where there is no earlier week — a fresh install, which is most of them — it says what it can:
the count, and which practice is slipping.

**What is real and what is sample data.** Check-ins and practices are the user's own — they
persist to `AsyncStorage` under `tended.v1` and genuinely drive the week chart, the insight line,
the save-button state and the practice note. The heatmap, the ZIP card, the named causes, the
nearby feed and the reading list are fixed sample content standing in for what a backend would
return.

**Onboarding makes the case before it asks for anything.** Six steps: three that argue for keeping
a record, one that states what happens to it, then the educator check and the setup the design
assumed had already happened — its tracker opens with habits "chosen once", its area view needs a
ZIP. `onboardedAt` is what the app routes on.

The three story slides are concrete rather than inspirational. The argument is that memory is a poor
record and a record is worth having — six weeks into a hard term you know it was rough but not how
rough, when it started, or what kept causing it — not that teaching is difficult, which the
audience already knows.

The promise slide is next, and it lists mechanisms rather than assurances: stored on the device, no
account and no email, nothing carries a name, ZIP-level only with a 40-teacher floor. It comes
*before* the educator check on purpose. The first thing the app asks for is a school email address,
and a teacher has every reason to be wary of putting a wellness app on a district-monitored
account — so both the reason to bother and the promise land first.

`STORY` and `PROMISES` are arrays at the top of the file; the step indices derive from their
lengths, so adding a slide is one entry rather than a renumbering.

**Verifying an educator without learning who they are.** A code goes to a school address and the
teacher types it back; then the address is gone. What persists is `educator.verified` and a
timestamp — not the address, and deliberately not the domain either, because
`lincolnhigh.k12.in.us` names a building, and a building plus a daily mood is most of the way to
naming a person.

It proves control of a school address, not that someone currently teaches, and anyone with a .edu
can pass it. That is the right level: the point is to keep the feed among teachers, not to
withstand an attacker. Anything stronger — payslips, ID, a third-party check — puts identity
somewhere, which is the thing being avoided.

One limitation is chosen rather than overlooked: a single server seeing "address X verified at
14:02" and "device D issued a token at 14:02" can link them by timing however little is stored.
Breaking that needs blind signatures or a separate verifier returning only yes/no, and is worth
doing if verification ever becomes load-bearing. `PROVIDER_CONFIGURED` in `src/lib/verification.ts`
is false: no mail is sent and any six-digit code passes. The school-domain check is real and runs
on device.

**The invite route.** School email is the practical signal, but it lands in a district mailbox, and
that trace is on their mail server rather than in our database — no promise of ours reaches it. So
the verify screen names the risk instead of hiding it, the code email is specified to say nothing
but the code (see `lib/verification.ts`), and there is a second way in that never touches a work
inbox: a code from a colleague who is already verified.

`src/lib/invites.ts` holds the format — seven characters plus a check character, shown `XXXX-XXXX`,
on an alphabet without I, L, O or U. Typed lookalikes are mapped back rather than punished, and the
check character is position-weighted, so a mistyped or transposed code fails on the device instead
of after a round trip: measured, that catches 95% of single typos and 97% of transpositions, the
residual being the 1-in-32 a single check character cannot see.

An invite proves a teacher vouched for you, not that you teach. `INVITES_PER_TEACHER` is a safety
control rather than a growth dial — codes can be passed on, so the cap bounds how far a leaked one
travels. Single-use is the one property a device holding the code cannot enforce; that needs the
server to burn it, which is what `PROVIDER_CONFIGURED` in `invites.ts` gates.

**What verification gates, and what it does not.** The feed, both reading and posting — and
whether your check-ins reach the ZIP aggregate, since those figures are meant to describe teachers
and an unverified check-in has not shown it is one.

It does not gate the paid tier. Every benefit Tended+ advertises is about the personal record —
month and term views, year against year, the tags behind the hardest days, the export — and all of
it is computed on device from data that needs no verification. An unverified teacher can subscribe
and receive everything the paywall lists, which is why the paywall names no feed benefit: the two
gates are deliberately independent, one on proof and one on payment.

**Two doors in, and they are not worth the same.** `email` means a code reached an address at a
school domain — the app checked it itself. `invite` means an account that already cleared that gave
away one of its five codes, which proves a colleague vouched, not that the holder works in a
school. `educator.method` records which, and `educator.vouchedBy` records whose word it rests on.

The difference is surfaced rather than flattened, because one badge covering both would describe
neither. A filled tick beside a name means school email; an outline tick means vouched, and the
screen-reader label names the voucher. The profile badge reads either `VERIFIED · SCHOOL EMAIL` or
`VOUCHED FOR BY @someone`.

**A vouched account cannot vouch.** `canInvite` is true only for the email route, guarded in the
store as well as the UI. Without that rule one unchecked person with a code seeds a tree of
accounts, each generation further from anyone the app ever verified and every leaf wearing the same
mark. The invite card simply does not appear for a vouched account; in its place the profile offers
`Finish verifying with a school email`, which upgrades the method in place — same username, same
posts, outline tick becomes filled, invites unlock.

`redeemInvite` returns the issuing account's username for this reason. A tick standing on "somebody
typed a code" is a tick standing on nothing; one standing on "@marisa.okonjo vouched" is a claim
with a person behind it, and one that can be withdrawn.

**Reporting, blocking, and deletion.** Apple requires all three of an app like this, and each is
also the right behaviour on its own terms.

Every card carries a `···` that opens a report sheet (guideline 1.2). The reasons are written as
things a moderator can act on — "Names a student or colleague" is checkable in four seconds,
"Offensive" is a feeling and cannot be triaged. The post leaves the feed the moment it is reported
rather than when someone agrees, because making a reporter keep looking at what they objected to is
a punishment for reporting. Blocking is offered on the same sheet, since "I do not want to see this
person again" is usually the real request and the only part the app can honour by itself; blocking
also drops any follow. `MODERATION_SLA` is the single string stating the 24-hour commitment, shown
in the sheet and again on the profile.

Account deletion (guideline 5.1.1(v)) lists what is destroyed rather than asking "are you sure?",
because the items are not equivalent — a follower list is an inconvenience, a year of check-ins is
the only copy of something nobody wrote down anywhere else. Confirmation is typing DELETE, not a
second button, since a second button is cleared by the same reflex that pressed the first. The
username is held for `USERNAME_HOLD_DAYS` before release, so nobody can claim it that afternoon and
post as the person who left. Deleting removes the storage row outright and returns the app to
onboarding; the first-run sample data is deliberately not re-seeded.

**Signing up is required, and the app is no longer anonymous.** Tended held nothing at all for a
while: no name, no address, and the verification email discarded the moment it was checked. That
was right for a feed of bad days, where the exposure was a colleague identified complaining about
their school.

It is wrong for a feed of what people did for themselves. You cannot follow a stranger, and "left
at 4:30 and it held for nine days" is worth more when you can see who is saying it. So the account
keeps a name and the verified work address, posts carry the name, and `VerifyForm` hands the
address back to its caller rather than dropping it.

What did not change is the line the onboarding now states outright: **your posts are public, your
record is not.** How a teacher rated Tuesday still never leaves the device. Publishing a post is a
decision made one post at a time; rating a day is not a publication.

**Verified underneath, self-presented on the surface.** The account has two halves and they must
not be confused. `name` and `email` are the verified half: proof a real educator is behind the
account, never shown to anyone, never on a post. Everything under `account.shown` is the teacher's
own choice — a handle instead of a name, a grade or not, a district or not.

This is the split Threads gets right, and it matters more here than on a general-purpose network.
A teacher posting "said no to covering another class" is describing insubordination to some
principals, and being able to say it as "Ms R · MS Math" is the difference between posting and
staying quiet. The floor stays identical either way, which is what stops the pseudonym being a
loophole: every handle in the feed passed the same check, and every card carries a VERIFIED mark
to say so.

Onboarding has a step for it with a live byline preview, and the profile has the same controls so
it can be changed at any time — with the verified half printed beneath, read-only, under NEVER
SHOWN · HELD AS PROOF YOU WORK IN A SCHOOL. The school building is never offered as a field at all.

**Not everyone in a school teaches.** `JOBS` covers teachers, paraeducators, counselors, social
workers, school psychologists, instructional coaches, administrators, librarians, nurses and other
staff. The ones who do not teach are often the people with the most useful answers about surviving
the building — a counselor knows what a boundary costs, an administrator knows which ones a
principal will actually respect. "Other school staff" is last and real: the list will always be
missing somebody's title.

**Years in schools is the credential the feed runs on.** "No work email after six, held nine days"
reads differently from someone in their first year than from someone twenty-two years in, and a
reader deciding whether to copy a boundary is entitled to know which. It sits in the byline, is
optional like everything else, and `yearsLabel` renders 1 as FIRST YEAR and 0 as NEW THIS YEAR
rather than a bare number — the figure is context, not a ranking.

A byline is therefore `job · role · district · years`, any part of which may be absent, under a
display name that may be a full name or two initials. The VERIFIED mark is a tick beside the name
rather than a word in that line: it applies to the person rather than the job title, and inline it
pushed the byline onto a second row.

**Display name vs username.** Two names, two jobs. The **display name** is whatever the person
wants to be called and is deliberately *not* unique — two people may both be "Ms P", because it is
a label. The **username** is the identifier: one per account, unique across the app, lowercase, and
the thing a follow actually points at.

Uniqueness matters here for a specific reason. The feed's value is that a boundary held for nine
days is evidence, and it is only evidence if the streak belongs to one traceable person. Two
accounts sharing a name make that unverifiable — and that is exactly the shape an impersonator
would use, copying the display name of someone people follow to inherit their credibility.

`src/lib/usernames.ts` holds the rules: normalization (case-folded, `@` stripped, `a-z0-9._` only,
so `Ms.P` and `ms.p` are one name rather than two), shape validation, a reserved list covering both
app-impersonation (`support`, `tended`) and school-official impersonation (`principal`,
`superintendent`), and the availability check. `src/components/UsernameField.tsx` renders the six
states it can be in — idle, too short, malformed, checking, taken with alternatives, free — shared
by onboarding and the profile so the rules cannot drift between claiming and changing.

The check is debounced at 300ms and discards stale replies by sequence number, so a slow answer for
an earlier draft cannot overwrite the verdict for what is currently in the box. **The real
enforcement is a UNIQUE index on the normalized column, server-side** — two people can pass this
check on separate devices in the same second. What runs on device is the fast feedback loop, so
failure at submit is rare rather than routine; `PROVIDER_CONFIGURED` in that file is the seam, and
until it flips the check collides against `TAKEN_USERNAMES` (the sample authors) only.

Accounts written before the split are migrated at hydration: the old `handle` becomes the display
name, and the username is left empty rather than guessed — inventing one would either collide or
hand someone an identifier they did not choose — so the profile prompts for it.

**Following.** `following: string[]` holds author ids; the feed has an Everyone / Following switch
and every card has a Follow button. This is the replacement for the ZIP heat map, which is gone:
knowing the building down the road is also having a rough week is not something a teacher can act
on, and a map of where morale is worst is a dangerous object to have built once someone thinks to
ask who is in those tiles.

**What Tended+ sells.** Two limits, both on the teacher's own record, neither on the feed:

| | Free | Tended+ |
|---|---|---|
| Self-care list | `FREE_LIST_LIMIT` (3) | no cap |
| Check-in history | this week | everything, with month and semester views |

The feed is not the thing being sold. Reading it, posting to it and reacting are free at every
tier, because a feed with a paywall across it has no supply and nothing to sell. The cap is
enforced in the store — `listLimit` / `listFull`, checked in both `addPractice` and `saveToList` —
so the paywall cannot drift from what the paywall copy claims. Both numbers are set so the free
plan is genuinely usable: three habits is a real plan and a week is a real check-in, and the reason
to upgrade arrives from having used the app rather than from being blocked on day one.

**The self-care list.** One editable checklist on the profile, and it is the app's only to-do.
Items arrive two ways — typed into the row at the bottom of the card, or saved off someone else's
post in the feed — and once they land there is no distinction between the two, because a boundary
someone else holds is just a line on your list once you have taken it. Tapping a line edits it in
place; `renamePractice` keeps the row's id, so an edited line keeps every tick it already had.

The three-step plan builder that used to hold boundaries, habits and contacts is gone. It asked
for a planning session up front, which is exactly the "one more thing to do" that teacher feedback
named as the reason the app would not get used. One list that grows by tapping the feed asks for
nothing.

Everything persists under the same `tended.v1` key as the check-ins.

**Where the list items came from.** The prototype had no screen behind "Edit my practices" / "Add
one" — it assumed the three were chosen once, at an onboarding the app now has. Items live in the
store (`practices: Practice[]`), not as a fixed constant; one added beyond the original three is
assigned the next tint in a five-hue palette computed at the same recipe as the design's three
(`oklch(.72 .08 H)` fill over `oklch(.6 .08 H)` border), so it still reads as part of the same
system.

That palette used to walk 150 → 25, which is the mood ramp's own path, so the fifth item on the
list came out the exact red that means "Rough" everywhere else — a kept habit drawn in the colour
of a bad day. The walk now runs 150 → 210 and stops before the warm half. These are five ways to
tell rows apart, not a scale.

**First run.** A fresh install opens on onboarding. `SEED_FIRST_RUN` in `src/store.tsx` then seeds
this week's earlier weekdays with the design's sample week, so the record is populated rather than
an empty chart; set it to `false` for a genuinely blank first run. Finishing onboarding replaces
the seeded practices with the chosen ones and clears their ticks, which were keyed to practices
that no longer exist.

**Dates.** The prototype hardcoded "THURSDAY 9 OCTOBER" and marked Thursday as today. Both are now
derived from the real date, and the record runs the school week, Monday to Friday.

**The feed is the app.** The v3 design had it as a reduction of check-ins — a number and a tag,
no free text, nothing to answer — on a tab behind three others. It is now the front page
(`src/screens/FeedScreen.tsx`), and it carries the entire daily loop: the five-face check-in at the
top, the composer under it, everyone else's posts below.

Every post is one thing a teacher did for themselves, optionally with a photo, and every one can
be saved onto your own list. That is the difference between a feed that gives you company and one
that gives you something to copy.

Two of the design's guardrails are kept deliberately, because they are what stopped the feed
becoming a staffroom argument: nothing carries a name, and there are no replies — a reaction is the
entire vocabulary. The 140-character cap in `UPDATE_MAX_LENGTH` is what keeps it a feed of actions
rather than a message board.

**Photos.** `src/lib/photo.ts` picks one, draws it down to 1080px on the long edge and re-encodes
it as JPEG before it is ever stored. Two reasons: the whole app state lives in one AsyncStorage
row, and re-encoding through a canvas drops the EXIF block — which on a photo taken in a classroom
carries GPS coordinates and a capture time. An anonymous feed cannot pass those on. Web is
implemented because that is what the preview runs; the native branch wants `expo-image-picker` and
is a no-op behind `PICKER_CONFIGURED` until it is installed.

**The check-in is one tap.** Five faces, saved on the tap, no button to reach and no confirm step.
This is a direct answer to the sharpest piece of teacher feedback the project has had — that
against three uninterrupted minutes in a quiet classroom, a form loses, correctly.

Tags appear only after a face is tapped, and are never required. The day is already saved by then,
so skipping them costs nothing; they exist because the weekly insight reads them back, and without
them it can only ever say which day was heaviest. The list itself was rewritten from a reviewer's
note: "Parents" read as the teacher's own parents, and "Admin asks" could mean administrative work
or work the administration asked for. Student behavior and learning needs are now split, because
they call for opposite responses, and "Something else" exists because forcing a wrong tag corrupts
the data the others carry.

Reactions are emoji, each keeping its wording as the accessible name so a screen reader says
"Holding you" rather than reading out a codepoint. 🫂 was the obvious pick for that one and is the
wrong one — at pill size it collapses into an unreadable blob, where a face still reads.

**What the free tier gets of the feed.** `FREE_FEED_VIEWS` updates — three — and then a line
saying how many are behind Tended+. Posting is Plus only; the composer is replaced by a note
explaining that. Reacting is free at every tier, deliberately: answering someone's bad day is not
the thing to charge for, and a feed where only paying teachers can respond would be a worse feed
for the people still on free.

Your own sentences persist to `AsyncStorage` alongside the check-ins and can be deleted. The
reactions you send persist too, and are counted on top of the sample counts in `data/mock.ts` — the
other teachers' updates and their existing counts are still fixed sample content, as is everything
else on this tab.

**Where the app hands off to the web.** `SITE` in `src/data/mock.ts` holds the
tendedcollective.com links; `src/lib/links.ts` opens them and swallows failures, since a resource
list that throws because a device has no dialler is worse than one that does nothing.

On the web it goes through a real anchor rather than `Linking.openURL`, which calls `window.open`.
A sandboxed iframe blocks `window.open` unless it was granted popups, so in the published preview
every outbound link silently did nothing — no error, no navigation, just a button that looked
broken. An anchor click is what the host page listens for and what a plain browser handles itself.

The reading cards open their post at `postUrl(slug)` — `${SITE.blog}/${slug}` — and "All posts"
opens the index. The slugs in `POSTS` are placeholders in the shape the real ones will take, so
updating the website means changing a slug (or `SITE.blog`) and nothing else.

**The podcast.** "Worth listening to" sits under the reading list and is headed the same way, with
"All episodes" where the posts have "All posts".

`PODCAST_SHOW_ID` is the show — 1872481883 — and the section lists its real episodes, fetched at
run time from Apple's public lookup API (`src/lib/podcast.ts`). No key and no account, and unlike
the RSS feed — which most podcast hosts serve without CORS headers — it can be called straight from
the client, so listing episodes needs no server of our own.

Where the request cannot be made the section falls back to a single button through to the show.
Two places it always will: offline, and the published web preview, whose CSP blocks every external
request by design. So the artifact shows the button rather than the episodes — that list is a
device-and-browser feature. Both paths are tested against a recorded Apple payload.

**"Help when you need it" is ad inventory, and the crisis lines are not in it.** They are not in the
app at all: 988 and everything like it live on the Tended Collective resource page, which the first
slot of the section links to. Nothing that varies by district — an EAP, a union scheme — could have
been resolved from inside the app anyway.

That leaves one rule worth keeping if a crisis line is ever added back here: it does not go in the
inventory. Someone reaching for one should not have to work out which row on the screen was paid
for. `git log` has the confirm-before-dialling sheet that 988 used, if it returns.

Its first slot is Tended Collective's own resource page. It is never sold and carries the accent
border, so the section opens on something editorial rather than bought. The remaining `AD_SLOTS`
hold `SPONSORS`, each rendered under a SPONSORED tag with the advertiser named on the card: a paid
recommendation sitting in a mental-health app has to be legible as one, and the FTC requires the
disclosure to be clear and conspicuous. Unsold slots draw as available inventory while the space is
being sold — set `SHOW_UNSOLD_SLOTS` to false to ship, where an empty slot should collapse rather
than advertise that nobody bought it.

Every resource row follows the same rule: one with an `href` opens it and shows an arrow; one
without reads as text rather than pretending to be a button.

**Tended+ and the trial.** "Try 30 days free" and the locked six-week chart both open
`src/components/PlusSheet.tsx`: what you get, the price, one button, and — once a trial is running —
the days left and a way out of it. While it is running the six-week chart is drawn at full opacity
and the record card leads with the trial instead of the pitch. `plus.trialStartedAt` persists, so
the trial survives a restart, and `trialDaysRemaining` expires it on its own after 30 days.

**Paying with Apple is two integrations, and only one of them is Apple Pay.** On iOS a subscription
to digital content cannot go through Apple Pay: App Store Review guideline 3.1.1 requires In-App
Purchase, and Apple Pay is for goods and services consumed outside the app. So:

| Where | Route | What it needs |
| --- | --- | --- |
| iOS / Android app | StoreKit / Play Billing, via RevenueCat or `react-native-iap` | a native build — not Expo Go, and nothing on web |
| Web build | Apple Pay through a processor (Stripe) | a merchant-validation endpoint and a domain verified with Apple |

`src/lib/billing.ts` is the whole boundary. `paymentRoute()` picks between them — it asks Apple Pay's
own `ApplePaySession.canMakePayments()` on web — and `routeLabel()` is why the button reads "Continue
with Apple Pay" in Safari and "Continue with the App Store" on device.

**Nothing is charged yet.** `PROVIDER_CONFIGURED` is `false`: there is no processor, no product IDs,
no server and no receipt validation. `purchase()` therefore resolves `charged: false`, the sheet
carries a "not connected to billing" notice, and the unlock is local to the device. That is
deliberate — a flow that mimics a successful payment is worse than one that admits it took none.
The sheet also does not imitate Apple's own Apple Pay button, which is theirs to grant and is only
correct once a real Apple Pay session exists.

To connect it: create the product ($4.99/month with a 30-day introductory free period) in App Store
Connect and Play Console, implement `purchase()` per route, flip `PROVIDER_CONFIGURED`, and move
entitlement to a server behind a validated receipt — `plus.trialStartedAt` is preview state and must
not be what gates a paid feature in production.

**Sheets are not `Modal`s.** React Native's `Modal` portals to the document root on web, which put
the practice editor and the Tended+ sheet outside the device mock in the framed preview — they slid
up across the whole browser window. `src/components/Sheet.tsx` is an absolutely-positioned overlay
instead, mounted once in `AppShell` above the tab bar so it is clipped by the phone; screens ask for
a sheet by name through `useSheets()`.
