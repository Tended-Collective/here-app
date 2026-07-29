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
| **Support** | The self-care practice tracker (seven tappable days per practice), three reading cards that open Tended Collective, and a compact crisis-and-clinical list near the bottom. |

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

Your own sentences persist to `AsyncStorage` alongside the check-ins and can be deleted. The
reactions you send persist too, and are counted on top of the sample counts in `data/mock.ts` — the
other teachers' updates and their existing counts are still fixed sample content, as is everything
else on this tab.

**Where the app hands off to the web.** `SITE` in `src/data/mock.ts` holds the three
tendedcollective.com links; `src/lib/links.ts` opens them and swallows failures, since a resource
list that throws because a device has no dialler is worse than one that does nothing.

The reading cards and "All posts" open the blog. `SITE.blog` is the one unverified link in the
app — the sandbox this was built in cannot reach the domain, so if the blog does not live at
`/blog` that constant is the only line to change. Each `POSTS` entry carries its own `url`, so real
per-post slugs can replace the shared link without touching the screen.

In the help list, a line with an `href` opens it and shows an arrow; a line without one reads as
text rather than pretending to be a button. That is why "Your EAP" is not pressable — the EAP is
your district's and the app has no address for it. 988 dials.

**Still not designed, so still not built.** "Try 30 days free" is pressable as in the prototype but
there is nothing behind it: billing is a product decision, not a missing screen, and a button that
appears to start a paid trial without one would be worse than an inert one.
