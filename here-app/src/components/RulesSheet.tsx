/**
 * The community rules, readable before you join and any time after.
 *
 * Opened from two places: the link in the sign-up agreement, and a row in
 * Settings. Both matter — the first is what makes the agreement meaningful, and
 * the second is what makes it findable by someone deciding whether to report
 * something.
 *
 * It is a sheet rather than a link out to the website because rules you have to
 * leave the app to read are rules nobody reads, and because a phone in a school
 * building frequently has no working connection.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COMMUNITY_RULES, NO_TOLERANCE, SAFETY_EMAIL } from '../data/rules';
import { SITE } from '../data/mock';
import { openLink } from '../lib/links';
import { color, radius } from '../theme';
import { SheetShell } from './Sheet';
import { Body, Display, MonoLabel } from './ui';

export function RulesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <SheetShell visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Text style={styles.sheetTitle}>Community rules</Text>
        <View style={styles.rule} />

        {/* Capped so the sheet cannot grow past the phone on a small screen —
            six rules and the enforcement note are more than fits at once. */}
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Display size={22} lineHeight={1.2} style={{ marginTop: 18 }}>
            What Here is for.
          </Display>
          <Body size={13.5} tone={color.muted} style={{ marginTop: 8 }}>
            People who work in schools, saying what they did to look after themselves. Six rules
            keep it that way.
          </Body>

          {COMMUNITY_RULES.map((r, i) => (
            <View key={r.title} style={styles.item}>
              <MonoLabel size={9} em={0.1} tone={color.faint}>
                {String(i + 1).padStart(2, '0')}
              </MonoLabel>
              <Text style={styles.itemTitle}>{r.title}</Text>
              <Text style={styles.itemBody}>{r.body}</Text>
            </View>
          ))}

          <View style={styles.enforcement}>
            <MonoLabel size={9} em={0.1} tone={color.accent}>
              HOW THIS IS ENFORCED
            </MonoLabel>
            <Text style={styles.enforcementBody}>{NO_TOLERANCE}</Text>
          </View>

          <Text style={styles.contact}>
            {/* "or a conversation with the flag in the thread" used to be here
                and named a feature that no longer exists — private messaging
                was pulled. Comments are what is left to report. */}
            Report a post with the flag on it, or a comment with the flag beside the name. For
            anything urgent, email{' '}
            <Text
              style={styles.link}
              onPress={() => openLink(`mailto:${SAFETY_EMAIL}`)}
              accessibilityRole="link"
            >
              {SAFETY_EMAIL}
            </Text>
            .
          </Text>

          <View style={styles.links}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Read the full terms of service"
              onPress={() => openLink(SITE.terms)}
            >
              <Text style={styles.linkRow}>Terms of service →</Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Read the privacy policy"
              onPress={() => openLink(SITE.privacy)}
            >
              <Text style={styles.linkRow}>Privacy policy →</Text>
            </Pressable>
          </View>
        </ScrollView>

        <Pressable accessibilityRole="button" style={styles.primary} onPress={onClose}>
          <Text style={styles.primaryLabel}>Done</Text>
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
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: color.ink,
    textAlign: 'center',
    paddingBottom: 16,
  },
  rule: {
    height: 1,
    marginHorizontal: -24,
    backgroundColor: color.hairline,
  },
  scroll: {
    maxHeight: 430,
  },
  item: {
    marginTop: 20,
    gap: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: color.ink,
  },
  itemBody: {
    fontSize: 13.5,
    lineHeight: 20,
    color: color.body,
  },
  enforcement: {
    marginTop: 26,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.accentBorderSoft,
    gap: 8,
  },
  enforcementBody: {
    fontSize: 13.5,
    lineHeight: 20,
    color: color.ink,
  },
  contact: {
    fontSize: 13,
    lineHeight: 20,
    color: color.muted,
    marginTop: 18,
  },
  link: {
    color: color.accent,
    textDecorationLine: 'underline',
  },
  links: {
    marginTop: 18,
    marginBottom: 8,
    gap: 12,
  },
  linkRow: {
    fontSize: 13.5,
    color: color.accent,
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
});
