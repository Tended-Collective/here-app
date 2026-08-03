/**
 * The purchase boundary. Everything the paywall knows about paying lives here,
 * so connecting a real processor is a change to this file and nothing else.
 *
 * ─── Paying with Apple is two different integrations ──────────────────────────
 *
 * On iOS a subscription to digital content cannot go through Apple Pay. App
 * Store Review guideline 3.1.1 requires In-App Purchase; Apple Pay is for goods
 * and services consumed outside the app, so shipping a $4.99/month Apple Pay
 * subscription inside the iOS build would be rejected. The two routes are:
 *
 *   route 'app-store'      iOS — StoreKit, via RevenueCat
 *                          (`react-native-purchases`) or `react-native-iap`.
 *                          Both need a native build: they do not run in Expo
 *                          Go, and they do not exist on web.
 *
 *   route 'apple-pay-web'  the web build — Apple Pay through a processor
 *                          (Stripe's Payment Request / Payment Element). Needs
 *                          a merchant-validation endpoint on a server and a
 *                          domain verified with Apple; Apple Pay JS cannot even
 *                          open its sheet without them.
 *
 * ─── What is wired now ───────────────────────────────────────────────────────
 *
 * `PROVIDER_CONFIGURED` is false: there is no processor, no product IDs, no
 * server and no receipt validation. `startTrial` therefore grants the trial on
 * this device and charges nothing, and every surface that calls it says so. It
 * is deliberately not a mock "successful payment" — a flow that looks like it
 * took a card but did not is worse than one that admits it.
 *
 * To connect it for real:
 *   1. Set up the product ($4.99/month with a 30-day introductory free period)
 *      in App Store Connect, or in RevenueCat over the top.
 *   2. Implement `purchase()` per route below and flip PROVIDER_CONFIGURED.
 *   3. Validate receipts server-side and hold entitlement there — the
 *      `plus.trialStartedAt` in the store is device-local state for the preview
 *      and must not be what gates a paid feature in production.
 */

import { Platform } from 'react-native';

/**
 * Android is not a target — the app is iPhone only (see app.config.js) — so
 * there is no Play Billing route. `unavailable` covers everywhere that is not
 * an iPhone or a Safari that can raise an Apple Pay sheet.
 */
export type PaymentRoute = 'app-store' | 'apple-pay-web' | 'unavailable';

/** Flip once a processor is actually wired up in `purchase()`. */
export const PROVIDER_CONFIGURED = false;

/**
 * Apple Pay's own availability check. Present only in Safari (and in WebKit
 * views) on a device with a card in Wallet, which is exactly the condition for
 * offering the web route.
 */
function applePayAvailable(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const session = (window as unknown as { ApplePaySession?: { canMakePayments?: () => boolean } })
    .ApplePaySession;
  try {
    return session?.canMakePayments?.() === true;
  } catch {
    // Some browsers throw rather than returning false when the API is gated.
    return false;
  }
}

export function paymentRoute(): PaymentRoute {
  if (Platform.OS === 'ios') return 'app-store';
  if (applePayAvailable()) return 'apple-pay-web';
  return 'unavailable';
}

/** What the button should say, given where the teacher is standing. */
export function routeLabel(route: PaymentRoute): string {
  switch (route) {
    case 'apple-pay-web':
      return 'Continue with Apple Pay';
    case 'app-store':
      return 'Continue with the App Store';
    default:
      return 'Start 30 days free';
  }
}

export type PurchaseResult =
  | { ok: true; charged: boolean; route: PaymentRoute }
  | { ok: false; reason: 'cancelled' | 'unavailable' | 'failed'; route: PaymentRoute };

/**
 * Start the subscription. Resolves `charged: false` while no processor is
 * configured — callers must surface that rather than implying a payment.
 */
export async function purchase(): Promise<PurchaseResult> {
  const route = paymentRoute();

  if (!PROVIDER_CONFIGURED) {
    return { ok: true, charged: false, route };
  }

  // ── Connect here ──────────────────────────────────────────────────────────
  // 'app-store':
  //   const { customerInfo } = await Purchases.purchasePackage(pkg);
  //   return { ok: true, charged: true, route };
  // 'apple-pay-web':
  //   confirm a Stripe subscription via the Payment Request API, then
  //   return { ok: true, charged: true, route };
  return { ok: false, reason: 'unavailable', route };
}

/**
 * Re-read entitlement from the store/processor. A real implementation asks the
 * server; with nothing configured there is nothing to restore.
 */
export async function restore(): Promise<{ active: boolean }> {
  if (!PROVIDER_CONFIGURED) return { active: false };
  return { active: false };
}
