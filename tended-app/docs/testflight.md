# Getting Tended onto TestFlight

The goal of this build is a pilot: twenty or so teachers with the app on their
own phone for a fortnight, so we learn whether the daily interaction survives a
real week. It runs entirely on sample content and needs no server.

Everything below has been verified locally except the steps that need an Apple
account or a Mac, which are marked **[needs Apple]**.

---

## What is in this build, honestly

- **The feed is fixed sample content.** Six accounts, a fixed set of posts. Every
  tester sees the same feed and nothing they post reaches anyone else.
- **Comments are sample threads.** The comments under a post are fixed content;
  anything you add is stored on your device and nobody else sees it.
- **There is no private messaging.** It was built and then pulled for a later
  rollout.
- **Verification sends no email.** Any six-digit code is accepted.
- **The paywall charges nothing.** Starting the trial unlocks the paid views on
  that device and says so.
- **Nothing leaves the phone.** No account, no sync, no analytics, no crash
  reporter. The whole app is one `AsyncStorage` row.

Tell testers this before they install. A tester who thinks the feed is live and
finds out later stops trusting the rest of it.

---

## One-time setup **[needs Apple]**

1. **Apple Developer Program** — $99/year, enrolled as Tended Collective.
2. **App Store Connect** — create the app record against bundle id
   `com.tendedcollective.tended`. Note the numeric Apple ID it gets.
3. **Expo account** — `npx eas login`, then `npx eas init` from `tended-app/`.
   That writes `extra.eas.projectId` into `app.config.js`; uncomment the line
   that is waiting for it.
4. **Fill in `eas.json`** — replace the three `REPLACE_ME` values under
   `submit.production.ios`. Use an App Store Connect API key rather than an Apple
   ID password; it is the only route that works unattended with two-factor auth.

---

## Building

```bash
cd tended-app

# Simulator first — no paid account, no device registration, fastest feedback.
npx eas build --platform ios --profile simulator

# A dev client on a real phone, for working on native code.
npx eas device:create          # register the phone once
npx eas build --platform ios --profile development

# The TestFlight build.
npx eas build --platform ios --profile production
npx eas submit --platform ios --latest
```

`expo-image-picker` is a native module, so **Expo Go is no longer a faithful
preview** — use the simulator or development profile instead.

To inspect what the config actually generates without building:

```bash
npx expo config --type public      # resolved app config
npx expo prebuild --platform ios --no-install   # writes ./ios, which is gitignored
```

---

## App Review notes — copy this into the submission

> Tended is for school staff. Accounts are verified by emailing a code to a work
> address, so a reviewer cannot sign up with a personal email — the app refuses
> consumer domains such as icloud.com and gmail.com by design.
>
> **To get in, use:**
>
> - Email: `review@tendedcollective.org`
> - Code: any six digits, for example `123456`
>
> No mail is sent in this build; the code field accepts any six digits.
>
>
> Reporting and blocking are on every post (the flag icon, top right of a post)
> and on every comment (the flag icon beside the commenter's name — tap the
> speech bubble under a post to open them). Account deletion is at the bottom of
> the Profile tab.
>
> There is no private messaging in this build.

**This is the single most likely cause of rejection.** It has been verified: a
reviewer typing `appreview@icloud.com` is refused with "That is a personal email
provider", and `review@tendedcollective.org` passes through to the code step and
on into the app.

---

## Still outstanding before submission

These are not needed for an internal TestFlight group, but App Review will want
them:

- [x] ~~**Terms with a no-tolerance clause, agreed at sign-up.**~~ Done. Sign-up
      now has a tick box that gates the verification button; the six community
      rules are in the bundle and readable from sign-up and from Settings; the
      no-tolerance sentence and the 24-hour commitment are stated; `support@` and
      `safety@` are published in-app; and the agreement date is recorded on the
      account as `agreedToRulesAt`.
- [ ] **The two hosted pages must exist.** `SITE.terms` and `SITE.privacy` point
      at `tendedcollective.com/terms` and `/privacy`. Both are linked from
      sign-up and from Settings, and **neither page exists yet**. A 404 on either
      is a rejection. The in-app rules cover what Apple wants users to agree to;
      these are the legal documents behind them and need a lawyer, not this repo.
- [ ] **`support@tendedcollective.com` and `safety@tendedcollective.com` must
      route somewhere a human reads.** They are printed in the app now.
- [ ] **Age rating.** User content — posts and comments — usually lands 12+ or
      17+ depending on how moderation is evidenced. Lower than it would have
      been: there is no private messaging in this build, which is the thing that
      normally forces 17+.
- [ ] **Someone actually reading reports.** The report sheet promises "Reports
      are reviewed within 24 hours." That is a commitment to a human rota. Either
      resource it or change the sentence.
- [ ] **`SEED_FIRST_RUN`** in `src/store.tsx` is `true`. It fabricates a week of
      check-ins and six weeks of habit ticks and presents them as the user's own
      record. Fine for a pilot where testers have been told; indefensible in the
      App Store. Note that turning it off does **not** empty the feed or the
      comments — those come from hardcoded constants in `src/data/mock.ts` and
      need a data layer, not a flag.
- [ ] **`ios.privacyManifests.NSPrivacyCollectedDataTypes`** in `app.config.js`
      is an empty array. That is accurate today because nothing leaves the
      device. It becomes false the moment any backend is wired up.

---

## What was configured, and why

| File | What it does |
|---|---|
| `app.config.js` | Was `app.json`. JavaScript so the "must change before X" caveats live next to the fields they apply to. Sets the bundle ids (a separate `.dev` one so both builds can sit on one phone), the photo permission sentence, `ITSAppUsesNonExemptEncryption` (skips the export-compliance questionnaire on every upload), and the privacy manifest. |
| `eas.json` | Four profiles: `simulator`, `development`, `preview`, `production`. `appVersionSource: remote` with `autoIncrement` so two people building the same day cannot collide on a build number. |
| `App.tsx` | Holds the native splash until the fonts have loaded. Without it the splash lifts when the JS mounts and the app sits on a blank screen while four font files load. |
| `src/lib/photo.ts` | Photo picking now works on a device, not only on the web preview. |
| `src/data/rules.ts` | The six community rules and the no-tolerance statement, in the bundle so they are readable on a phone with no signal and cannot drift from what the app enforces. |
| `src/components/RulesSheet.tsx` | The rules, openable from sign-up and from Settings. |
| Sign-up | A tick box gating the send button, and `agreedToRulesAt` on the account as the record that it happened. |
| `src/screens/SignIn.tsx` | The other front door. Sign-up used to be the only way in, so anyone who signed out was walked through the whole story again. Honest about the fact that a device with no account has nothing to sign in to. |

### The one that needed care

`expo-image-picker` has a fast path: when nothing asks it to modify the image it
copies the original file byte for byte and hands that back — **EXIF and GPS
intact**. A classroom photo carries the coordinates of the school.

Passing `quality: 0.72` happens to defeat it, because the re-encode loses the
metadata. But that would make our privacy promise depend on an undocumented
branch inside a dependency, and a version bump could quietly reinstate the
original file. So the picker is asked for the image and nothing else, and
`expo-image-manipulator` does the resize and JPEG encode explicitly. The output
is built from decoded pixels and cannot carry the source's metadata whatever the
picker decided to hand over.

Verified on the web path end to end: a 1600×1200 PNG comes back as a 1080×810
JPEG data URI at about 6 KB.
