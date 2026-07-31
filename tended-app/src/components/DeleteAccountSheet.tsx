/**
 * Deleting the account.
 *
 * Required by App Store guideline 5.1.1(v) of any app that lets you create an
 * account, and right regardless: an app holding a record of how someone's year
 * actually went has no business making that record hard to end.
 *
 * This used to itemise five things in five bullets — posts, follows, the
 * username hold, the address. Nobody reads a five-line inventory on the way out
 * of an app, and the length made the one sentence that matters harder to find:
 * the check-ins are the only copy. That sentence is now the whole warning.
 *
 * Confirmation is still typing the word rather than a second button, which the
 * same reflex that pressed the first would clear.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useStore } from '../store';
import { color, radius } from '../theme';
import { SheetShell } from './Sheet';
import { Body, Display, MonoLabel } from './ui';

const CONFIRM_WORD = 'DELETE';

/**
 * How long a released username is held before anyone else may take it. Nothing
 * enforces this on device — it is the server's job — but the promise is made
 * here because the reason for it concerns the person deleting: without a hold,
 * someone can claim their name the same afternoon and post under it.
 */
export const USERNAME_HOLD_DAYS = 30;

export function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { deleteAccount, entries } = useStore();
  const [typed, setTyped] = useState('');

  const close = () => {
    onClose();
    setTimeout(() => setTyped(''), 200);
  };

  const days = Object.keys(entries).length;
  const ready = typed.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <SheetShell visible={visible} onClose={close}>
      <View style={styles.body}>
        <Display size={26} lineHeight={1.15}>
          Delete your account?
        </Display>
        <Body size={14} tone={color.muted} style={{ marginTop: 10 }}>
          Your posts, your list and your{' '}
          {days > 0 ? `${days} ${days === 1 ? 'check-in' : 'check-ins'}` : 'check-ins'} are erased.
          This is the only copy, and it cannot be undone.
        </Body>

        <MonoLabel style={{ marginTop: 22 }}>TYPE {CONFIRM_WORD} TO CONFIRM</MonoLabel>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          placeholder={CONFIRM_WORD}
          placeholderTextColor={color.faint}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
          accessibilityLabel={`Type ${CONFIRM_WORD} to confirm deleting your account`}
        />

        <Pressable
          accessibilityRole="button"
          disabled={!ready}
          onPress={() => {
            deleteAccount();
            close();
          }}
          style={[styles.destructive, !ready && { opacity: 0.35 }]}
        >
          <Text style={styles.destructiveLabel}>Delete my account</Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={close} style={styles.quiet}>
          <Text style={styles.quietLabel}>Keep my account</Text>
        </Pressable>
      </View>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 30,
  },
  input: {
    height: 50,
    marginTop: 10,
    paddingHorizontal: 16,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.card,
    fontSize: 15,
    letterSpacing: 1.5,
    color: color.ink,
    outlineColor: color.accent,
    outlineWidth: 2,
    outlineOffset: 1,
  },
  destructive: {
    height: 50,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: '#a4574f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveLabel: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#fff',
  },
  quiet: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  quietLabel: {
    fontSize: 14.5,
    fontWeight: '600',
    color: color.ink,
  },
});
