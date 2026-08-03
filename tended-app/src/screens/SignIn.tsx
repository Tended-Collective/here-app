/**
 * Signing back in.
 *
 * ─── What this is for ────────────────────────────────────────────────────────
 *
 * Until now the app had sign-up and nothing else: the only way past the front
 * door was to create an account. Anyone who signed out, or came back to a phone
 * where the app had been reset, was walked through the whole six-screen story
 * and asked to choose a username that was already theirs.
 *
 * So there is a front door now. The first screen offers both, and this is the
 * other half of it — the same school-email check, without the story, the
 * identity questions or the rules agreement, because all three already happened
 * once.
 *
 * ─── What it cannot do yet, and says so ──────────────────────────────────────
 *
 * There is no server. The account lives in one AsyncStorage row on this device,
 * so "signing in" is checking the address against the one this device already
 * holds. On the phone where you signed out, that works exactly as it should.
 *
 * On a *new* phone there is nothing to sign in to, and this screen says that
 * plainly rather than spinning or failing with a wrong-password shrug. It is a
 * consequence of the record being device-only — the same property that lets the
 * app promise the check-ins never leave the phone — and it is the first thing
 * the backend will change.
 */

import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useChrome } from '../components/PhoneFrame';
import { VerifyForm } from '../components/VerifyForm';
import { Body, Display, MonoLabel } from '../components/ui';
import { useStore } from '../store';
import { color, radius, SCREEN_PADDING } from '../theme';

export function SignIn({ onCreateAccount }: { onCreateAccount: () => void }) {
  const { signIn, account } = useStore();
  const { topInset } = useChrome();
  const { width: screenWidth } = useWindowDimensions();
  const [problem, setProblem] = useState<string | null>(null);

  // Nothing on this device to sign in to. Worth saying before they type an
  // address and a code and get turned away at the end of it.
  const nothingHere = !account?.email;

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* The same picture that opens sign-up, so the two doors feel like two
            doors into one building rather than two different apps. Shorter
            here: someone signing back in wants the field, not the view. */}
        <Image
          source={require('../../assets/welcome.jpg')}
          style={[styles.welcome, { width: screenWidth }]}
          resizeMode="cover"
          accessibilityLabel="Watercolour of school staff walking home along a sunlit sidewalk at the end of the day."
        />
        <MonoLabel>HERE</MonoLabel>
        <Display size={29} style={{ marginTop: 12 }}>
          Welcome back.
        </Display>
        <Body size={15} tone={color.muted} style={{ marginTop: 10 }}>
          Sign in with the school email you joined with.
        </Body>

        {nothingHere ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No account on this phone</Text>
            <Text style={styles.emptySub}>
              Your check-ins are stored on the device that made them and are not backed up
              anywhere, so there is nothing here to sign in to yet. Create an account to start on
              this phone.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.primary}
              onPress={onCreateAccount}
            >
              <Text style={styles.primaryLabel}>Create an account</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <VerifyForm
              onVerified={(address) => {
                if (signIn(address)) return;
                setProblem(
                  'That is not the address this phone is signed up with. Check it, or create a new account.',
                );
              }}
            />
            {!!problem && <Text style={styles.problem}>{problem}</Text>}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create a new account instead"
              onPress={onCreateAccount}
              style={styles.switch}
            >
              <Text style={styles.switchLabel}>Create a new account instead</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.ground,
  },
  content: {
    ...SCREEN_PADDING,
    paddingBottom: 24,
  },
  welcome: {
    // See the note in Onboarding: the width has to come from the window, not
    // from the image's intrinsic size.
    marginLeft: -24,
    marginTop: -6,
    marginBottom: 24,
    height: 280,
    backgroundColor: color.cardSoft,
  },
  empty: {
    marginTop: 24,
    padding: 18,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.outline,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: '600',
    color: color.ink,
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 20,
    color: color.muted,
    marginTop: 6,
  },
  primary: {
    height: 50,
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#fff',
  },
  problem: {
    fontSize: 13,
    lineHeight: 19,
    color: '#a4524d',
    marginTop: 14,
  },
  switch: {
    marginTop: 22,
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 13.5,
    color: color.accent,
  },
});
