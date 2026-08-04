/**
 * The first screen of the app.
 *
 * ─── Why it looks like this ──────────────────────────────────────────────────
 *
 * There were two front doors: a marketing page with a full-bleed illustration
 * and a sign-in field on it, and an onboarding slide with the same words set
 * inside a 24pt frame under a cropped band of the same picture. Two artefacts
 * saying the same thing in two visual languages, and the phone got the weaker
 * one. This is the merge, and the page's version won.
 *
 * The illustration fills the screen and the words sit directly on it. That only
 * works because of where the art puts its light: the top third is open golden
 * sky, and the people and the street are in the bottom two-thirds. So the
 * headline lives in the sky, and a wash fades the ground colour in from the top
 * and back out by the halfway mark — enough to hold contrast on a bright phone
 * outdoors, light enough to read as haze rather than as a panel over the art.
 *
 * The source is the whole illustration at 853x1844. A portrait phone is within
 * a percent of that ratio, so `cover` takes almost all of it and crops almost
 * nothing — which is why this uses the full picture where the old band needed a
 * pre-cropped file.
 *
 * ─── The field, and what it does ─────────────────────────────────────────────
 *
 * An address typed here is the start of signing up, not a newsletter box. It is
 * checked the same way the sign-up step checks it — the same inverted gate that
 * refuses consumer mail providers and lets every district oddity through — so
 * nobody is waved past here only to be turned away two screens later.
 *
 * An empty field is not an error. It means "tell me more", which is what the
 * three story slides are for, so the arrow falls through to them.
 */

import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useChrome } from '../components/PhoneFrame';
import { isConsumerDomain, isPlausibleEmail } from '../lib/verification';
import { color, font } from '../theme';

const ART_LABEL =
  'Watercolour of five school staff walking home along a sunlit sidewalk at the end of the day, past a school bus, a mural and a city skyline.';

export function Cover({
  onStart,
  onSignIn,
}: {
  /** The typed address, or an empty string when they just want to read on. */
  onStart: (email: string) => void;
  onSignIn?: () => void;
}) {
  const { topInset } = useChrome();
  const [email, setEmail] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const start = () => {
    const typed = email.trim();
    if (!typed) {
      onStart('');
      return;
    }
    if (!isPlausibleEmail(typed)) {
      setProblem('That does not look like an email address.');
      return;
    }
    if (isConsumerDomain(typed)) {
      setProblem('That is a personal email provider. Use the address your school gave you.');
      return;
    }
    setProblem(null);
    onStart(typed);
  };

  return (
    <View style={styles.root}>
      {/* Absolutely filled rather than sized from the window. An Image with a
          `require`d source lays out at the file's intrinsic size and `flex: 1`
          does not override it — but a definite frame from the parent does, and
          it is the frame this actually occupies. Measuring the window instead
          drew the art 940pt tall inside the 874pt screen of the web preview's
          device mock, which zoomed past the sun and the skyline: the two things
          the composition is built around. */}
      <Image
        source={require('../../assets/cover.jpg')}
        style={styles.art}
        resizeMode="cover"
        accessibilityLabel={ART_LABEL}
      />
      <LinearGradient
        colors={['rgba(246,245,242,0.92)', 'rgba(246,245,242,0.45)', 'rgba(246,245,242,0)']}
        locations={[0, 0.24, 0.58]}
        style={styles.art}
        pointerEvents="none"
      />

      <View style={[styles.inner, { paddingTop: topInset + 14 }]}>
        <View style={styles.top}>
          <Text style={styles.mark}>Here</Text>
          <Text style={styles.pilot}>IN PILOT</Text>
        </View>

        <View style={styles.mid}>
          <Text style={styles.title}>A moment for yourself.</Text>
          <Text style={styles.sub}>
            In the work we do, it’s easy to give to our students, staff, and families. Here is the
            intentional pause we need—a quiet moment to check in with ourselves and see what’s
            working for fellow educators.
          </Text>

          {/* The pill floats on the picture rather than sitting in a card. */}
          <View style={styles.pill}>
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setProblem(null);
              }}
              placeholder="School email address"
              placeholderTextColor={color.faint}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              accessibilityLabel="Your school email address"
              onSubmitEditing={start}
              returnKeyType="go"
            />
            <Pressable
              onPress={start}
              accessibilityRole="button"
              accessibilityLabel="Get started"
              style={styles.go}
            >
              <Text style={styles.goLabel}>Get started →</Text>
            </Pressable>
          </View>

          {!!problem && <Text style={styles.problem}>{problem}</Text>}

          {!!onSignIn && (
            <Pressable
              onPress={onSignIn}
              accessibilityRole="button"
              accessibilityLabel="Sign in to an existing account"
              hitSlop={8}
              style={styles.noteRow}
            >
              <Text style={styles.note}>
                Already have an account? <Text style={styles.noteLink}>Log in</Text>
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.ground,
  },
  art: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mark: {
    fontFamily: font.displayRegular,
    fontSize: 21,
    color: color.ink,
  },
  pilot: {
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    color: color.faint,
  },
  mid: {
    marginTop: 18,
    alignItems: 'center',
  },
  title: {
    fontFamily: font.displayLight,
    fontSize: 42,
    lineHeight: 45,
    letterSpacing: -0.5,
    color: color.ink,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14.5,
    lineHeight: 22,
    color: color.body,
    textAlign: 'center',
    marginTop: 14,
    /**
     * The subhead is the one block long enough to reach the busy half of the
     * picture. A halo in the ground colour carries it over the figures without
     * putting a panel on the art; the wash alone is not enough this far down.
     */
    textShadowColor: color.ground,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 24,
    padding: 5,
    paddingLeft: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    shadowColor: '#282218',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 44,
    paddingHorizontal: 10,
    fontSize: 15,
    color: color.ink,
  },
  go: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goLabel: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#fff',
  },
  problem: {
    fontSize: 13,
    lineHeight: 19,
    color: '#a4524d',
    textAlign: 'center',
    marginTop: 12,
    textShadowColor: color.ground,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  /**
   * This is the one line that lands below the pill, which puts it on the
   * figures — the busiest part of the picture. On the web the same caption gets
   * away with a triple text-shadow halo; React Native allows exactly one shadow
   * layer, and one was not enough to carry it over a backpack. So it sits on a
   * soft chip of the ground colour instead: still not a panel across the art,
   * but legible whatever happens to be behind it.
   */
  noteRow: {
    marginTop: 14,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(246,245,242,0.86)',
  },
  note: {
    fontSize: 13.5,
    color: color.body,
    textAlign: 'center',
  },
  noteLink: {
    color: color.accent,
    fontWeight: '600',
  },
});
