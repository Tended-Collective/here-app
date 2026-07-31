/**
 * Reporting a post, and blocking whoever wrote it.
 *
 * Apple requires this of any app carrying user content: a way to report, a way
 * to block, and a stated commitment to act (guideline 1.2). It is also the
 * thing a named feed of school staff needs most. The feed has no replies, which
 * removes most of the ways a social space goes wrong, but it cannot stop
 * someone naming a student, advertising, or posting as staff when they are not.
 *
 * Two deliberate choices in the flow. The post is hidden the moment it is
 * reported rather than when a moderator agrees — making a reporter keep looking
 * at the thing they objected to is a punishment for reporting. And blocking is
 * offered on the same sheet, because "I do not want to see this person again"
 * is usually the actual request, and it is the one the app can honour by
 * itself.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AUTHORS } from '../data/mock';
import { useStore } from '../store';
import { color, radius } from '../theme';
import { SheetShell } from './Sheet';
import { Body, Display, MonoLabel } from './ui';

/**
 * Written as what a moderator can act on. "Offensive" is a feeling and cannot
 * be triaged; "names a student" is a fact someone can check against the post in
 * about four seconds.
 */
const REASONS = [
  'Not school staff',
  'Names a student or colleague',
  'Harassment or abuse',
  'Spam or advertising',
  'Encourages self-harm',
  'Something else',
];

/** What the app promises to do, and when. Shown before they commit, not after. */
export const MODERATION_SLA = 'Reports are reviewed within 24 hours.';

export function ReportSheet({
  visible,
  onClose,
  subject,
}: {
  visible: boolean;
  onClose: () => void;
  subject: { updateId: string; authorId: string } | null;
}) {
  const { reportPost, blockAuthor } = useStore();
  const [reason, setReason] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const author = subject ? AUTHORS[subject.authorId] : undefined;

  const close = () => {
    onClose();
    // Reset after the sheet is gone, so the next open starts clean without the
    // list visibly emptying under the closing animation.
    setTimeout(() => {
      setReason(null);
      setDone(false);
    }, 200);
  };

  const submit = (alsoBlock: boolean) => {
    if (!subject || !reason) return;
    reportPost(subject.updateId, reason);
    if (alsoBlock) blockAuthor(subject.authorId);
    setDone(true);
  };

  return (
    <SheetShell visible={visible} onClose={close}>
      <View style={styles.body}>
        {done ? (
          <>
            <MonoLabel>REPORTED</MonoLabel>
            <Display size={26} lineHeight={1.15} style={{ marginTop: 10 }}>
              Thank you. It is out of your feed.
            </Display>
            <Body size={13.5} tone={color.muted} style={{ marginTop: 10 }}>
              {MODERATION_SLA} You will not see this post again either way, and nobody is told who
              reported it.
            </Body>
            <Pressable accessibilityRole="button" style={styles.primary} onPress={close}>
              <Text style={styles.primaryLabel}>Done</Text>
            </Pressable>
          </>
        ) : (
          <>
            <MonoLabel>REPORT THIS POST</MonoLabel>
            <Display size={26} lineHeight={1.15} style={{ marginTop: 10 }}>
              What is wrong with it?
            </Display>
            <Body size={13.5} tone={color.muted} style={{ marginTop: 10 }}>
              {MODERATION_SLA} The post leaves your feed straight away.
            </Body>

            <View style={styles.reasons}>
              {REASONS.map((r) => {
                const on = reason === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setReason(r)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={[styles.reason, on && styles.reasonOn]}
                  >
                    <Text style={[styles.reasonLabel, on && styles.reasonLabelOn]}>{r}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={!reason}
              onPress={() => submit(false)}
              style={[styles.primary, !reason && { opacity: 0.4 }]}
            >
              <Text style={styles.primaryLabel}>Report</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={!reason}
              accessibilityLabel={`Report and block ${author?.displayName ?? 'this account'}`}
              onPress={() => submit(true)}
              style={[styles.secondary, !reason && { opacity: 0.4 }]}
            >
              <Text style={styles.secondaryLabel}>
                Report and block {author ? `@${author.username}` : 'this account'}
              </Text>
            </Pressable>

            <Pressable accessibilityRole="button" onPress={close} style={styles.quiet}>
              <Text style={styles.quietLabel}>Cancel</Text>
            </Pressable>
          </>
        )}
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
  reasons: {
    marginTop: 18,
    gap: 7,
  },
  reason: {
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.card,
  },
  reasonOn: {
    borderColor: color.accent,
    borderWidth: 2,
  },
  reasonLabel: {
    fontSize: 14.5,
    color: color.body,
  },
  reasonLabelOn: {
    color: color.ink,
    fontWeight: '600',
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
  secondary: {
    height: 50,
    marginTop: 9,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: color.outlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.ink,
  },
  quiet: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  quietLabel: {
    fontSize: 14,
    color: color.muted,
  },
});
