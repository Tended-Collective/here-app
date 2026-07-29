/**
 * The Tended+ sheet: what you get, what it costs, and the one button that
 * starts it. Also where a running trial is managed, so "Try 30 days free" is
 * not a door that only opens one way.
 *
 * The design never drew this — the prototype's CTA had nothing behind it — so
 * like the practice editor it is built from the app's own card, pill and
 * divider vocabulary rather than a new visual language.
 *
 * On honesty: no processor is connected (see lib/billing.ts), so the sheet says
 * plainly that nothing is charged and that the unlock is local to the device.
 * It deliberately does not imitate Apple's own Apple Pay button — that mark is
 * theirs to grant and is only correct once a real Apple Pay session exists.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PLUS_BENEFITS, PRICING, TRIAL_DAYS } from '../data/mock';
import { paymentRoute, PROVIDER_CONFIGURED, purchase, routeLabel } from '../lib/billing';
import { color, font, radius } from '../theme';
import { SheetShell } from './Sheet';
import { Body, Display, Divider, MonoLabel } from './ui';

export function PlusSheet({
  visible,
  onClose,
  active,
  daysLeft,
  onStart,
  onEnd,
}: {
  visible: boolean;
  onClose: () => void;
  active: boolean;
  daysLeft: number;
  onStart: () => void;
  onEnd: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const route = paymentRoute();

  const start = async () => {
    setBusy(true);
    setFailed(false);
    const result = await purchase();
    setBusy(false);
    if (result.ok) onStart();
    else if (result.reason !== 'cancelled') setFailed(true);
  };

  return (
    <SheetShell visible={visible} onClose={onClose}>
      <View style={styles.body}>
          <View style={styles.head}>
            <MonoLabel tone={color.accent}>TENDED+</MonoLabel>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
            >
              <Text style={styles.closeMark}>✕</Text>
            </Pressable>
          </View>

          {active ? (
            <>
              <Display size={26} lineHeight={1.15} style={{ marginTop: 10 }}>
                {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left in your trial.
              </Display>
              <Body style={{ marginTop: 10 }}>
                The term view and the six-week chart are open. Nothing has been charged — see the
                note below.
              </Body>

              <Divider style={styles.divider} />

              <Pressable onPress={onEnd} accessibilityRole="button" style={styles.secondary}>
                <Text style={styles.secondaryLabel}>End trial</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Display size={26} lineHeight={1.15} style={{ marginTop: 10 }}>
                See the shape of a whole term.
              </Display>

              <View style={styles.benefits}>
                {PLUS_BENEFITS.map((benefit) => (
                  <View key={benefit} style={styles.benefitRow}>
                    <View style={styles.tick} />
                    <Text style={styles.benefitLabel}>{benefit}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.price}>{PRICING.price}</Text>
                <Text style={styles.cadence}>{PRICING.cadence}</Text>
              </View>

              <Pressable
                onPress={start}
                disabled={busy}
                accessibilityRole="button"
                style={[styles.cta, busy && { opacity: 0.5 }]}
              >
                <Text style={styles.ctaLabel}>{busy ? 'One moment…' : routeLabel(route)}</Text>
              </Pressable>

              <Text style={styles.terms}>
                {TRIAL_DAYS} days free, then {PRICING.price} a month. Cancel any time.
              </Text>

              {failed && (
                <Text style={styles.failed}>
                  That didn’t go through. Nothing was charged — try again in a moment.
                </Text>
              )}
            </>
          )}

          {!PROVIDER_CONFIGURED && (
            <View style={styles.notice}>
              <MonoLabel size={9} em={0.1} tone={color.muted}>
                NOT CONNECTED TO BILLING
              </MonoLabel>
              <Body size={12} lineHeight={1.55} tone={color.muted} style={{ marginTop: 5 }}>
                No card is charged and no subscription is created. This unlocks Tended+ on this
                device so the term views can be reviewed.
              </Body>
            </View>
          )}
      </View>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: 20,
    paddingBottom: 30,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeMark: {
    fontSize: 16,
    color: color.label,
    padding: 4,
  },
  benefits: {
    marginTop: 16,
    gap: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  tick: {
    width: 7,
    height: 7,
    borderRadius: 99,
    marginTop: 7,
    backgroundColor: color.accent,
    opacity: 0.55,
  },
  benefitLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: color.body,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 18,
  },
  price: {
    fontFamily: font.displayRegular,
    fontSize: 28,
    color: color.ink,
  },
  cadence: {
    fontSize: 13,
    color: color.muted,
  },
  cta: {
    height: 52,
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  terms: {
    fontSize: 12,
    color: color.label,
    marginTop: 10,
    textAlign: 'center',
  },
  failed: {
    fontSize: 12.5,
    color: color.body,
    marginTop: 10,
    textAlign: 'center',
  },
  divider: {
    marginTop: 18,
    marginBottom: 16,
  },
  secondary: {
    height: 50,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: color.outlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.ink,
  },
  notice: {
    marginTop: 18,
    padding: 13,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.card,
  },
});
