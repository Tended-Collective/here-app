/**
 * Deleting the account.
 *
 * Required by App Store guideline 5.1.1(v) of any app that lets you create an
 * account, and right regardless: an app holding a record of how someone's year
 * actually went has no business making that record hard to end.
 *
 * The sheet lists what goes rather than asking "are you sure?", because the
 * things being destroyed are not equivalent. Losing a follower list is an
 * inconvenience. Losing a year of check-ins is losing the only copy of
 * something nobody wrote down anywhere else, and a teacher deleting in a bad
 * week deserves to be told that before it happens rather than after.
 *
 * Confirmation is typing the word, not a second button. A second button is
 * cleared by the same reflex that pressed the first.
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
  const { deleteAccount, account, entries, updates } = useStore();
  const [typed, setTyped] = useState('');

  const close = () => {
    onClose();
    setTimeout(() => setTyped(''), 200);
  };

  const days = Object.keys(entries).length;
  const posts = updates.length;
  const ready = typed.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <SheetShell visible={visible} onClose={close}>
      <View style={styles.body}>
        <MonoLabel>DELETE YOUR ACCOUNT</MonoLabel>
        <Display size={26} lineHeight={1.15} style={{ marginTop: 10 }}>
          This cannot be undone.
        </Display>

        <View style={styles.list}>
          <Line>
            {days > 0
              ? `${days} ${days === 1 ? 'check-in' : 'check-ins'} and everything on your self-care list. This is the only copy.`
              : 'Your check-ins and your self-care list. This is the only copy.'}
          </Line>
          <Line>
            {posts > 0
              ? `Your ${posts} ${posts === 1 ? 'post' : 'posts'}, and the reactions on them.`
              : 'Any posts you make, and the reactions on them.'}
          </Line>
          <Line>Who you follow, and anyone following you.</Line>
          <Line>
            {account?.shown.username ? `@${account.shown.username}` : 'Your username'}, held for{' '}
            {USERNAME_HOLD_DAYS} days so nobody can take it and post as you, then released.
          </Line>
          <Line>Your name and work address. Nothing of the account is kept.</Line>
        </View>

        <MonoLabel style={{ marginTop: 20 }}>TYPE {CONFIRM_WORD} TO CONFIRM</MonoLabel>
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

function Line({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.lineRow}>
      <View style={styles.bullet} />
      <Text style={styles.lineText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 30,
  },
  list: {
    marginTop: 18,
    gap: 12,
  },
  lineRow: {
    flexDirection: 'row',
    gap: 11,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 99,
    marginTop: 8,
    backgroundColor: 'rgba(180,103,98,0.75)',
  },
  lineText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: color.ink,
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
