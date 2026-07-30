/**
 * The step between tapping a crisis line and reaching it.
 *
 * 988 answers both a call and a text, so the row has to ask which anyway — and
 * asking is the point. A crisis line is the last number that should be
 * reachable by a pocket, and an accidental call to it costs a counsellor's time
 * on someone who is not there.
 *
 * Nothing here is a warning or a discouragement: both ways out are full-width
 * primary buttons, and cancelling is the quiet one.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CrisisLine } from '../data/mock';
import { openLink } from '../lib/links';
import { color, radius } from '../theme';
import { SheetShell } from './Sheet';
import { Body, Display } from './ui';

export function CrisisSheet({
  visible,
  line,
  onClose,
}: {
  visible: boolean;
  line: CrisisLine | null;
  onClose: () => void;
}) {
  if (!line) return null;

  const reach = (href: string) => {
    openLink(href);
    onClose();
  };

  return (
    <SheetShell visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Display size={24} lineHeight={1.2}>
          {line.title}
        </Display>
        <Body style={{ marginTop: 8 }}>{line.sub}</Body>

        {line.call && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Call ${line.id}`}
            style={styles.primary}
            onPress={() => reach(line.call!)}
          >
            <Text style={styles.primaryLabel}>Call {line.id}</Text>
          </Pressable>
        )}

        {line.text && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Text ${line.id}`}
            style={styles.secondary}
            onPress={() => reach(line.text!)}
          >
            <Text style={styles.secondaryLabel}>Text {line.id}</Text>
          </Pressable>
        )}

        <Pressable accessibilityRole="button" style={styles.cancel} onPress={onClose}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
      </View>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: 20,
    paddingBottom: 30,
  },
  primary: {
    height: 52,
    marginTop: 20,
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
  secondary: {
    height: 52,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: color.outlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: color.ink,
  },
  cancel: {
    height: 44,
    marginTop: 6,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontSize: 15,
    color: color.muted,
  },
});
