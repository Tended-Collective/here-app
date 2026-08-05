/**
 * The circle with a letter in it, and the colour that goes behind it.
 *
 * Shared between the feed and the inbox so the same person is the same colour in
 * both — a tint that changed between screens would read as two accounts. The
 * colour is derived from the username rather than stored, because the username is
 * already unique and a colour is not worth a column.
 *
 * Deliberately not the mood ramp: a person is not a score, and a red circle
 * beside a name in a feed about how people are doing would be read as one.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Twelve muted tints rather than six. Six was too few to keep an inbox of
 * same-initial names apart — two adjacent rows both showing an M in the same
 * circle read as one account posting twice. Collisions are still possible and
 * still harmless: the name beside the circle is what identifies someone.
 */
const TINTS = [
  '#5c7f86', '#7a6f8e', '#84705c', '#5f7f68', '#8a6470', '#68758f',
  '#4f6f78', '#6f5f7d', '#7a6650', '#4e7059', '#7d5a66', '#586a86',
];

export function avatarTint(key: string): string {
  // Position-weighted rather than a plain character sum: summing put
  // marisa.okonjo and mrr_counsel on the same tint, which is two adjacent inbox
  // rows both showing a purple M.
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 100003;
  return TINTS[hash % TINTS.length];
}

export function Avatar({
  name,
  seed,
  size = 40,
}: {
  /** Shown as its first letter. */
  name: string;
  /** What the colour is derived from — the username, not the display name. */
  seed: string;
  size?: number;
}) {
  return (
    <View style={[styles.avatar, { width: size, height: size, backgroundColor: avatarTint(seed) }]}>
      <Text style={[styles.letter, { fontSize: size * 0.4 }]}>
        {(name || '?').slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontWeight: '700',
    color: '#fff',
  },
});
