/**
 * The one check: a school address, and a code that reaches it.
 *
 * There was a second route — an invite code from an existing account — for
 * anyone unwilling to put a wellness app near a district-monitored inbox. It is
 * gone. It proved a colleague vouched rather than that the holder works in a
 * school, and carrying that difference honestly meant two kinds of tick, a rule
 * about who may vouch, and an upgrade path. One check is simpler to explain and
 * simpler to trust.
 *
 * The verified address is handed back to the caller and stored on the account.
 *
 * The screen carries no explanation of its own beyond the sub-header and the
 * privacy line. Two blocks used to sit here — a paragraph about what a district
 * can see in its mail logs, and a NOT CONNECTED banner announcing that any
 * six-digit code passes. The first answered a question nobody had asked yet and
 * argued against the very step it was attached to; the second was scaffolding
 * for whoever is building this, printed on the screen a teacher signs up on.
 * `PROVIDER_CONFIGURED` in lib/verification.ts is still the flag, and any
 * six-digit code still passes while it is false — it just no longer says so.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CODE_LENGTH,
  isPlausibleEmail,
  looksLikeEducatorDomain,
  requestCode,
  submitCode,
} from '../lib/verification';
import { color, font, radius } from '../theme';

export function VerifyForm({ onVerified }: { onVerified: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setProblem(null);
    const result = await requestCode(email);
    setBusy(false);
    if (result.ok) {
      setCodeSent(true);
      return;
    }
    setProblem(
      result.reason === 'consumer-domain'
        ? 'That is a personal email provider. Use your work address.'
        : result.reason === 'invalid-email'
          ? 'That address is not formatted correctly.'
          : 'Could not send a code. Try again.',
    );
  };

  const confirm = async () => {
    setBusy(true);
    setProblem(null);
    const result = await submitCode(code);
    setBusy(false);
    if (result.ok) {
      onVerified(email);
      return;
    }
    setProblem(
      result.reason === 'bad-code' ? `That code should be ${CODE_LENGTH} digits.` : 'That didn’t work.',
    );
  };

  return (
    <View>
      {!codeSent ? (
        <>
          <TextInput
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setProblem(null);
            }}
            placeholder="you@yourschool.edu"
            placeholderTextColor={color.faint}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            accessibilityLabel="Your school email address"
          />
          <Primary
            label={busy ? 'Sending…' : 'Send verification code'}
            disabled={busy || !isPlausibleEmail(email)}
            onPress={send}
          />
          {isPlausibleEmail(email) && !looksLikeEducatorDomain(email) && !problem && (
            <Text style={styles.hint}>
              We do not recognize that domain as a school, but districts use all sorts — lausd.net,
              houstonisd.org, k12.dc.gov. Send the code and see if it arrives.
            </Text>
          )}
        </>
      ) : (
        <>
          <TextInput
            value={code}
            onChangeText={(t) => {
              setCode(t);
              setProblem(null);
            }}
            placeholder={`${CODE_LENGTH}-digit code`}
            placeholderTextColor={color.faint}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            accessibilityLabel={`The ${CODE_LENGTH} digit code sent to your school address`}
          />
          <Primary label={busy ? 'Checking…' : 'Verify'} disabled={busy} onPress={confirm} />
          <Pressable onPress={() => setCodeSent(false)} accessibilityRole="button">
            <Text style={styles.quiet}>Use a different address</Text>
          </Pressable>
        </>
      )}

      {problem && <Text style={styles.problem}>{problem}</Text>}

    </View>
  );
}

function Primary({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[styles.primary, disabled && { opacity: 0.4 }]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 50,
    marginTop: 18,
    paddingHorizontal: 16,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.card,
    fontSize: 15,
    color: color.ink,
    outlineColor: color.accent,
    outlineWidth: 2,
    outlineOffset: 1,
  },
  codeInput: {
    fontFamily: font.mono,
    fontSize: 18,
    letterSpacing: 3,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12.5,
    lineHeight: 19,
    color: color.label,
    marginTop: 10,
  },
  problem: {
    fontSize: 13,
    lineHeight: 20,
    color: color.ink,
    marginTop: 12,
  },
  quiet: {
    fontSize: 14,
    color: color.muted,
    paddingVertical: 10,
  },
  primary: {
    height: 52,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
