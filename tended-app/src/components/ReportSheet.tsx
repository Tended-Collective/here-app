/**
 * Reporting a post, and blocking whoever wrote it.
 *
 * Apple requires this of any app carrying user content: a way to report, a way
 * to block, and a stated commitment to act (guideline 1.2). It is also the thing
 * a named feed of school staff needs most. The feed has no replies, which
 * removes most of the ways a social space goes wrong, but it cannot stop someone
 * naming a student, advertising, or posting as staff when they are not.
 *
 * The shape is a flag on the post opening a list of reasons, one tap each. It
 * used to be a select-then-submit form, which is two taps to do what the row
 * already says, and the explanation of how reporting works lived on the profile
 * — a page nobody visits at the moment they want to report something.
 *
 * Two things the flow keeps. The post is hidden the moment it is reported rather
 * than when a moderator agrees, because making a reporter keep looking at what
 * they objected to is a punishment for reporting. And blocking sits at the foot
 * of the same list, because "I do not want to see this person again" is usually
 * the actual request and the only part the app can honour by itself.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AUTHORS } from '../data/mock';
import { useStore } from '../store';
import { color, radius } from '../theme';
import { ReportSubject, SheetShell } from './Sheet';
import { Body, Display } from './ui';

/**
 * Written as what a moderator can act on. "Offensive" is a feeling and cannot be
 * triaged; "names a student" is a fact someone can check against the post in
 * about four seconds.
 *
 * Two are specific to a feed of school staff, and they are the two most likely
 * to be used: a post naming a child, and an account that does not work in a
 * school. Neither appears on a general-purpose network's list.
 */
const REASONS = [
  'Names a student or colleague',
  'Not school staff',
  'Bullying or unwanted contact',
  'Suicide, self-injury or eating disorders',
  'Violence, hate or exploitation',
  'Scam, fraud or spam',
  'I just do not like it',
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
  subject: ReportSubject | null;
}) {
  const { reportPost, blockAuthor } = useStore();
  const [done, setDone] = useState(false);

  const author = subject ? AUTHORS[subject.authorId] : undefined;
  const isComment = subject?.kind === 'comment';

  const close = () => {
    onClose();
    // Reset after the sheet is gone, so the next open starts clean without the
    // list visibly emptying under the closing animation.
    setTimeout(() => setDone(false), 200);
  };

  const submit = (reason: string, alsoBlock: boolean) => {
    if (!subject) return;
    reportPost(subject.updateId, reason);
    if (alsoBlock) blockAuthor(subject.authorId);
    setDone(true);
  };

  return (
    <SheetShell visible={visible} onClose={close}>
      <View style={styles.body}>
        {done ? (
          <>
            <Display size={24} lineHeight={1.15}>
              {isComment ? 'Thanks. It is hidden.' : 'Thanks. It is out of your feed.'}
            </Display>
            <Body size={13.5} tone={color.muted} style={{ marginTop: 10 }}>
              {MODERATION_SLA} Nobody is told who reported it.
            </Body>
            <Pressable accessibilityRole="button" style={styles.primary} onPress={close}>
              <Text style={styles.primaryLabel}>Done</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.sheetTitle}>Report</Text>
            <View style={styles.rule} />

            <Display size={22} lineHeight={1.2} style={{ marginTop: 20, textAlign: 'center' }}>
              Why are you reporting this?
            </Display>
            <Body size={13} tone={color.muted} style={styles.centred}>
              Your report is anonymous. If someone is in immediate danger, call your local emergency
              services — do not wait.
            </Body>

            {/* One tap per reason, no confirm step. A reason list where each row
                needs selecting and then submitting is two taps to do the thing
                the row already says. */}
            <View style={styles.reasons}>
              {REASONS.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => submit(r, false)}
                  accessibilityRole="button"
                  accessibilityLabel={`Report this ${isComment ? 'comment' : 'post'}: ${r}`}
                  style={styles.reason}
                >
                  <Text style={styles.reasonLabel}>{r}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}

              <Pressable
                onPress={() => submit('Blocked by reader', true)}
                accessibilityRole="button"
                accessibilityLabel={`Block ${author ? `@${author.username}` : 'this account'}`}
                style={styles.reason}
              >
                <Text style={styles.reasonLabel}>
                  Block {author ? `@${author.username}` : 'this account'}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </View>
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
  centred: {
    marginTop: 8,
    textAlign: 'center',
  },
  reasons: {
    marginTop: 20,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  reasonLabel: {
    flex: 1,
    fontSize: 15.5,
    color: color.ink,
  },
  chevron: {
    fontSize: 20,
    lineHeight: 22,
    color: color.faint,
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
