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
| **Your area** | ZIP heatmap with the steady→rough legend, your-ZIP card, what people named here, the contribution toggle, and the live nearby feed. |
| **Support** | The self-care practice tracker (seven tappable days per practice), three reading/listening cards, and a compact crisis-and-clinical list near the bottom. |

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

**What is real and what is sample data.** Check-ins and practice ticks are the user's own — they
persist to `AsyncStorage` under `tended.v1` and genuinely drive the week chart, the insight line,
the save-button state and the practice note. The heatmap, the ZIP card, the named causes, the
nearby feed and the reading list are fixed sample content standing in for what a backend would
return.

**First run.** `SEED_FIRST_RUN` in `src/store.tsx` seeds this week's earlier weekdays with the
design's sample week so a fresh install opens on a populated record rather than an empty chart.
Set it to `false` for a genuinely blank first run.

**Dates.** The prototype hardcoded "THURSDAY 9 OCTOBER" and marked Thursday as today. Both are now
derived from the real date, and the record runs the school week, Monday to Friday.

**The nearby feed opt-in.** The transcript left this open. One switch — "Include my check-ins" —
governs both the ZIP map and the live feed; with it off, the feed card explains that it reads from
the same pool. Splitting it into a second toggle would be a small change in `AreaScreen`.

**Not designed, so not built.** "Edit my practices" and "Add one" on the Support tab, "All posts",
"See the last hour", the help-list rows and "Try 30 days free" are present and pressable as in the
prototype, but there are no screens behind them in the design.
