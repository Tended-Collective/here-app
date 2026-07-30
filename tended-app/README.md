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
| **Support** | The self-care practice tracker (seven tappable days per practice), three reading cards that open Tended Collective, a crisis block, and the sponsored shelf below it. |

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

**Type.** Newsreader 300/400 and IBM Plex Mono 500/600 are bundled via `@expo-google-fonts`.
CSS `letter-spacing` is em-relative and React Native's is absolute, so `monoLabel()` multiplies the
em value through by the font size.

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
say: one sentence, and three named reactions to send back (`src/components/NearbyFeed.tsx`).

Two of the design's guardrails are kept deliberately, because they are what stopped the feed
becoming a staffroom argument: nothing carries a name, and there are no replies — a reaction is the
entire vocabulary. The 140-character cap in `UPDATE_MAX_LENGTH` is what keeps it a feed of days
rather than a message board. Reactions are words rather than emoji because the app has no emoji
anywhere else.

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

`SITE.podcast` is the show on Apple Podcasts, linked from under the reading list. A show's
permalink is `https://podcasts.apple.com/us/podcast/<slug>/id<showId>`; until the show ID is to
hand this points at an Apple Podcasts search that resolves, rather than a guessed ID that would
404.

**The support section is a crisis block and an ad shelf, and they are kept apart.** "If it's
urgent" holds the crisis lines and is never sold — someone reaching for one should not have to work
out which row on the screen was paid for. "Help when you need it" below it is the inventory.

Only nationally reachable lines go in the crisis block. Anything that varies by district — an EAP,
a union scheme — cannot be resolved from inside the app, so it belongs on the Tended Collective
resource page the first slot below points at, not in a row the app cannot make true for everyone.

Its first slot is Tended Collective's own resource page. It is never sold and carries the accent
border, so the section opens on something editorial rather than bought. The remaining `AD_SLOTS`
hold `SPONSORS`, each rendered under a SPONSORED tag with the advertiser named on the card: a paid
recommendation sitting in a mental-health app has to be legible as one, and the FTC requires the
disclosure to be clear and conspicuous. Unsold slots draw as available inventory while the space is
being sold — set `SHOW_UNSOLD_SLOTS` to false to ship, where an empty slot should collapse rather
than advertise that nobody bought it.

Everything in both blocks follows the same rule as the rest of the resource lists: a line with an
`href` opens it and shows an arrow; a line without one reads as text rather than pretending to be a
button. 988 dials.

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
