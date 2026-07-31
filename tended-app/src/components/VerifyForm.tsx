/**
 * The educator check, by either of two doors.
 *
 * The email door: an address at a school domain, and a code that reaches it.
 * The app checks this one itself. The address is handed back to the caller and
 * stored on the account — it used to be discarded on the spot, which was right
 * while the app held no identity at all and stopped being right once posts
 * carried a name.
 *
 * The invite door: a code from an account that already cleared the first one.
 * This proves a colleague vouched, not that the holder works in a school, so it
 * reports who vouched rather than an address. The two outcomes are kept
 * distinct all the way to the badge, because a mark that means either one means
 * neither.
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
import { format, isWellFormed, redeemInvite } from '../lib/invites';
import { color, font, radius } from '../theme';
import { Body, MonoLabel } from './ui';

/** Which door they came in by, and what it rests on. */
export type VerifyOutcome = { method: 'email'; email: string } | { method: 'invite'; vouchedBy: string };

export function VerifyForm({ onVerified }: { onVerified: (outcome: VerifyOutcome) => void }) {
  // Two routes in. The invite one exists because the email one lands in a
  // district mailbox, which is the objection no promise of ours can answer.
  const [route, setRoute] = useState<'email' | 'invite'>('email');
  const [invite, setInvite] = useState('');
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
      onVerified({ method: 'email', email });
      return;
    }
    setProblem(
      result.reason === 'bad-code' ? `That code should be ${CODE_LENGTH} digits.` : 'That didn’t work.',
    );
  };

  const redeem = async () => {
    setBusy(true);
    setProblem(null);
    const result = await redeemInvite(invite);
    setBusy(false);
    if (result.ok) {
      onVerified({ method: 'invite', vouchedBy: result.vouchedBy });
      return;
    }
    setProblem(
      result.reason === 'malformed'
        ? 'That code is not valid. Check it against the one you were sent.'
        : result.reason === 'used'
          ? 'That code has already been used.'
          : 'Could not check that code. Try again.',
    );
  };

  if (route === 'invite') {
    return (
      <View>
        <TextInput
          value={invite}
          onChangeText={(t) => {
            setInvite(format(t));
            setProblem(null);
          }}
          placeholder="XXXX-XXXX"
          placeholderTextColor={color.faint}
          style={[styles.input, styles.codeInput]}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={9}
          accessibilityLabel="Your invite code"
        />
        <Primary
          label={busy ? 'Checking…' : 'Use this code'}
          disabled={busy || !isWellFormed(invite)}
          onPress={redeem}
        />
        <Pressable onPress={() => { setRoute('email'); setProblem(null); }} accessibilityRole="button">
          <Text style={styles.quiet}>Use a school email instead</Text>
        </Pressable>
        {problem && <Text style={styles.problem}>{problem}</Text>}
      </View>
    );
  }

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

          {/* The one part of this we cannot control sits on the district's mail
              server. Naming it is worth more than any promise we could make
              about our own storage. */}
          <Text style={styles.hint}>
            This goes to your work inbox, which your district can usually see. The email reads only
            “Your Tended code is …” and does not say what the app does. To avoid it entirely, use an
            invite code from a colleague instead.
          </Text>
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

      <Pressable onPress={() => { setRoute('invite'); setProblem(null); }} accessibilityRole="button">
        <Text style={styles.quiet}>Use an invite code instead</Text>
      </Pressable>

      {!PROVIDER_CONFIGURED && (
        <View style={styles.notice}>
          <MonoLabel size={9} em={0.1} tone={color.muted}>
            NOT CONNECTED
          </MonoLabel>
          <Body size={12} lineHeight={1.55} tone={color.muted} style={{ marginTop: 5 }}>
            No mail is sent yet. Any {CODE_LENGTH}-digit code will pass.
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
