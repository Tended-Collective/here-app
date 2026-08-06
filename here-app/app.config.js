/**
 * Expo app config.
 *
 * This was app.json. It is JavaScript now because half of what matters here is
 * *why* a field holds the value it does, and several of these values are only
 * correct while the app has no backend. A JSON file cannot carry that warning,
 * and a wrong privacy declaration is the kind of mistake that is discovered by
 * Apple rather than by us.
 *
 * ─── iPhone only, on purpose ─────────────────────────────────────────────────
 *
 * `platforms` is iOS and web. Web is the preview pipeline — `expo export
 * --platform web` is what builds the shareable artifact — and is not a product
 * surface; nobody is meant to use Here in a browser.
 *
 * Android is gone rather than unfinished. `supportsTablet` is false for the
 * same reason: every screen here is a single column sized for a phone held in
 * one hand, and an iPad would stretch that column to 1024pt with 24pt of
 * padding either side. Claiming the device also means App Review tests on it.
 *
 * ─── Read this before the first build with a server behind it ────────────────
 *
 * `ios.privacyManifests.NSPrivacyCollectedDataTypes` below is empty, and that is
 * currently accurate: nothing leaves the device. No account, no sync, no
 * analytics, no crash reporter — the whole app is one AsyncStorage row. The
 * moment any of `lib/verification.ts`, `lib/billing.ts` or a feed API is wired
 * up, that array is wrong and must be filled in before submitting.
 */

const IS_PRODUCTION = process.env.APP_VARIANT !== 'development';

module.exports = {
  expo: {
    name: IS_PRODUCTION ? 'Here' : 'Here (dev)',
    slug: 'here-app',
    version: '1.0.0',
    // Portrait only: the check-in is five faces in a row and the feed is one
    // column. Neither gains anything from landscape and both would need a
    // second layout to survive it.
    orientation: 'portrait',
    platforms: ['ios', 'web'],
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    backgroundColor: '#f6f5f2',

    /**
     * The EAS project this builds against, at expo.dev/accounts/labfourseven.
     *
     * `owner` has to be here because the project lives under that account
     * rather than under whoever is logged in — without it a build cannot find
     * the project and fails with something unhelpful about permissions.
     *
     * `slug` above must stay `here-app`: it is what ties this config to that
     * project, and changing one without the other breaks the link.
     */
    owner: 'labfourseven',
    extra: { eas: { projectId: 'd7b01951-0a38-437d-abe6-27681632bc3a' } },

    ios: {
      supportsTablet: false,
      // A separate identifier for dev builds means both can sit on one phone,
      // which is how you compare a change against what testers currently have.
      bundleIdentifier: IS_PRODUCTION
        ? 'com.tendedcollective.here'
        : 'com.tendedcollective.here.dev',

      infoPlist: {
        /**
         * The app uses no encryption beyond HTTPS, which is exempt. Declaring it
         * here skips the export-compliance questionnaire on every single
         * TestFlight upload — otherwise each build sits in "Missing Compliance"
         * until someone answers the same two questions by hand.
         */
        ITSAppUsesNonExemptEncryption: false,
      },

      /**
       * Apple requires this file for every app since spring 2024. Each Expo
       * module ships its own fragment (expo-file-system and async-storage both
       * declare their file-timestamp and disk-space use) and Xcode merges them;
       * what follows is the app's own declaration on top.
       */
      privacyManifests: {
        // Nothing here tracks anyone, and there is nowhere for it to phone home.
        NSPrivacyTracking: false,
        NSPrivacyTrackingDomains: [],
        /**
         * Empty because it is true today — see the warning at the top of this
         * file. When the backend lands this will need, at minimum:
         *
         *   Email address        — verification. Not linked, not tracking.
         *   User content         — posts, photos, messages.
         *   Other data           — the check-in record, IF it is ever synced.
         *   Identifiers          — whatever a session token counts as.
         */
        NSPrivacyCollectedDataTypes: [],
        NSPrivacyAccessedAPITypes: [
          {
            /**
             * The habit grid and the check-in record are keyed by date, and the
             * app reads the clock to know which week to draw (`lib/useToday.ts`).
             * CA92.1 is "access info from same app, per documentation".
             */
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
            NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
          },
        ],
      },
    },

    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },

    plugins: [
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          // The mark, not a full-bleed image. The ground colour does the rest,
          // and it is the same #f6f5f2 the app opens on, so there is no flash
          // between the splash and the first screen.
          imageWidth: 180,
          resizeMode: 'contain',
          backgroundColor: '#f6f5f2',
        },
      ],
      [
        'expo-image-picker',
        {
          /**
           * The permission sentence a teacher actually reads, and the only
           * chance to say what the photo is for before iOS asks. Deliberately
           * concrete: it names the one place a photo is used.
           */
          photosPermission:
            'Here uses your photos only when you choose one to attach to a post. Nothing is uploaded until you tap Post.',
          /**
           * The composer has two buttons now — take one, or choose one — so the
           * camera string is real. It says the same thing the photos one does,
           * because the guarantee is the same: the shot is downscaled and
           * re-encoded on the device (lib/photo.ts), which is what drops the
           * GPS coordinates a classroom photo would otherwise carry.
           */
          cameraPermission:
            'Here uses the camera only when you take a photo for a post. Nothing is uploaded until you tap Post.',
          // Still no microphone: the composer attaches a still image and never
          // records. False so the string is not added and iOS never asks for a
          // permission the app cannot use.
          microphonePermission: false,
        },
      ],
    ],
  },
};
