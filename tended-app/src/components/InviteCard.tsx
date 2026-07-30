/**
 * Where a verified teacher gets codes to hand out.
 *
 * This is the half of the educator check that never touches a work inbox: a
 * colleague types the code and is in, having given the app nothing. It is also
 * the only growth the app has, which is deliberate — a feed that fills up the
 * way a staffroom does stays a staffroom.
 *
 * The cap is a safety control. Codes can be passed on, so bounding how many
 * exist per teacher bounds how far a leaked one travels.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { format, INVITES_PER_TEACHER } from '../lib/invites';
import { useStore } from '../store';
import { color, font, radius } from '../theme';
import { Body, Card, MonoLabel } from './ui';

export function InviteCard() {
  const { educator, invites, createInvite } = useStore();
  if (!educator.verified) return null;

  const left = INVITES_PER_TEACHER - invites.length;

  return (
    <>
      <MonoLabel style={{ marginTop: 26 }}>BRING SOMEONE IN</MonoLabel>
      <Card style={styles.card}>
        <Body size={13.5} tone={color.muted}>
          A code lets a colleague in without a school email — nothing arrives in their work inbox.
        </Body>

        {invites.length > 0 && (
          <View style={styles.codes}>
            {invites.map((invite) => (
              <View key={invite.code} style={styles.codeRow}>
                <Text style={styles.code}>{format(invite.code)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.foot}>
          <MonoLabel size={9.5} em={0.1} tone={color.faint}>
            {left > 0 ? `${left} OF ${INVITES_PER_TEACHER} LEFT` : 'ALL USED'}
          </MonoLabel>
          <Pressable
            onPress={createInvite}
            disabled={left <= 0}
            accessibilityRole="button"
            accessibilityLabel="Create an invite code"
            style={[styles.button, left <= 0 && { opacity: 0.4 }]}
          >
            <Text style={styles.buttonLabel}>Create a code</Text>
          </Pressable>
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    padding: 18,
  },
  codes: {
    marginTop: 14,
    gap: 8,
  },
  codeRow: {
    paddingVertical: 12,
    borderRadius: radius.row,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.outline,
    alignItems: 'center',
  },
  code: {
    fontFamily: font.monoBold,
    fontSize: 18,
    letterSpacing: 3,
    color: color.ink,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: color.ink,
  },
});
