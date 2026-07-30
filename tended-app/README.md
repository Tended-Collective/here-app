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
| **Today** | "How are you doing, right now?" — five-step mood ramp, one tap, plus optional tags. Saves to the device. |
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

**The practice editor.** The prototype has no screen behind "Edit my practices" / "Add one" — it
assumes the three practices were chosen once, at an onboarding this simplified app never built.
`src/components/PracticeEditor.tsx` is the minimum needed to make both buttons real: a sheet to
remove a practice or add one, built from the app's own card/pill/divider vocabulary rather than a
new visual language. Practices now live in the store (`practices: Practice[]`), not as a fixed
constant; a practice added beyond the original three is assigned the next tint in a five-hue
palette computed at the same recipe as the design's three (`oklch(.72 .08 H)` fill over
`oklch(.6 .08 H)` border), so it still reads as part of the same system.

**First run.** `SEED_FIRST_RUN` in `src/store.tsx` seeds this week's earlier weekdays with the
design's sample week so a fresh install opens on a populated record rather than an empty chart.
Set it to `false` for a genuinely blank first run.

**Dates.** The prototype hardcoded "THURSDAY 9 OCTOBER" and marked Thursday as today. Both are now
derived from the real date, and the record runs the school week, Monday to Friday.

**The nearby feed opt-in.** The transcript left this open. One switch — "Include my check-ins" —
governs both the ZIP map and the live feed; with it off, the feed card explains that it reads from
the same pool and hides the composer too. Splitting it into a second toggle would be a small
change in `AreaScreen`.

**The nearby feed is words now, not check-in echoes.** The v3 design had the feed as a reduction of
check-ins — a number and a tag, no free text, nothing to answer. It is now what teachers actually
say: one sentence, and three reactions to send back (`src/components/NearbyFeed.tsx`).

Two of the design's guardrails are kept deliberately, because they are what stopped the feed
becoming a staffroom argument: nothing carries a name, and there are no replies — a reaction is the
entire vocabulary. The 140-character cap in `UPDATE_MAX_LENGTH` is what keeps it a feed of days
rather than a message board.

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

**Where the app hands off to the web.** `SITE` in `src/data/mock.ts` holds the three
tendedcollective.com links; `src/lib/links.ts` opens them and swallows failures, since a resource
list that throws because a device has no dialler is worse than one that does nothing.

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
