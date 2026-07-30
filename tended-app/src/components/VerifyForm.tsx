/**
 * The educator check: school address, then the code sent to it.
 *
 * Shared by onboarding and the prompt the feed shows when someone skipped it,
 * so there is one implementation of a flow that must not drift — and so the
 * promise made beside it ("then the address is discarded") is made in one
 * place. Nothing here writes the address anywhere; see lib/verification.ts.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CODE_LENGTH,
  isPlausibleEmail,
  looksLikeEducatorDomain,
  PROVIDER_CONFIGURED,
  requestCode,
  submitCode,
} from '../lib/verification';
import { color, radius } from '../theme';
import { Body, MonoLabel } from './ui';

export function VerifyForm({ onVerified }: { onVerified: () => void }) {
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
      result.reason === 'not-a-school-domain'
        ? 'That doesn’t look like a school address. Use your work one, or skip this for now.'
        : result.reason === 'invalid-email'
          ? 'That address doesn’t look right.'
          : 'Couldn’t send a code just now.',
    );
  };

  const confirm = async () => {
    setBusy(true);
    setProblem(null);
    const result = await submitCode(code);
    setBusy(false);
    if (result.ok) {
      onVerified();
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
            label={busy ? 'Sending…' : 'Send me a code'}
            disabled={busy || !isPlausibleEmail(email)}
            onPress={send}
          />
          {isPlausibleEmail(email) && !looksLikeEducatorDomain(email) && !problem && (
            <Text style={styles.hint}>
              We’ll only accept a school domain — .edu, .k12, .ac.uk and the like.
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

      {!PROVIDER_CONFIGURED && (
        <View style={styles.notice}>
          <MonoLabel size={9} em={0.1} tone={color.muted}>
            NOT CONNECTED
          </MonoLabel>
          <Body size={12} lineHeight={1.55} tone={color.muted} style={{ marginTop: 5 }}>
            No mail is sent yet, and any {CODE_LENGTH}-digit code will pass.
          </Body>
        </View>
      )}
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
  notice: {
    marginTop: 20,
    padding: 13,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.card,
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
