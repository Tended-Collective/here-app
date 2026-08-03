/**
 * Comments under a post.
 *
 * ─── What this gives up, on purpose ──────────────────────────────────────────
 *
 * The feed's oldest rule was that there are no replies: a reaction was the whole
 * vocabulary, so a post had nothing to argue under it and the feed could not
 * become somewhere to argue. Comments end that. It is a deliberate trade — the
 * follow-up a reaction cannot carry ("how long did it take to stick", "what did
 * your principal say") is most of what makes someone else's practice usable —
 * but the guardrail has to be replaced rather than simply dropped.
 *
 * What replaces it:
 *
 *   - Every comment carries the same flag as a post, opening the same reason
 *     list. Reporting one hides it immediately, before any moderator sees it.
 *   - Blocking from a comment blocks the account, so their posts and their
 *     comments go together. A block that left comments behind would be worse
 *     than no block at all.
 *   - Your own comments can be deleted by you, always.
 *
 * Their side is sample content (data/mock.ts). Everything the teacher writes is
 * real and persisted, so ordering, length limits and deletion behave the way
 * they will against a server.
 */

import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AUTHORS, authorLine, SAMPLE_COMMENTS } from '../data/mock';
import { timeAgoLabel } from '../lib/dates';
import { COMMENT_MAX_LENGTH, useStore } from '../store';
import { color, radius } from '../theme';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { SheetShell } from './Sheet';
import { Body, Display, MonoLabel } from './ui';

/** A comment as the sheet needs it, whichever side it came from. */
type Shown = {
  id: string;
  authorId: string | null;
  name: string;
  username: string;
  line: string;
  text: string;
  at: number;
  mine: boolean;
};

export function CommentsSheet({
  visible,
  postId,
  onClose,
  onReport,
}: {
  visible: boolean;
  postId: string | null;
  onClose: () => void;
  /** Opens the report sheet against a comment's author. */
  onReport: (authorId: string) => void;
}) {
  const { comments, addComment, removeComment, blocked, reported, account } = useStore();
  const [draft, setDraft] = useState('');

  const mine = postId ? (comments[postId] ?? []) : [];
  const shown = useMemo<Shown[]>(() => {
    if (!postId) return [];
    const now = Date.now();
    const theirs: Shown[] = (SAMPLE_COMMENTS[postId] ?? [])
      // Blocked authors and reported comments never render, on any path.
      .filter((c) => !blocked.includes(c.authorId))
      .map((c, i) => {
        const author = AUTHORS[c.authorId];
        return {
          id: `${postId}-s${i}`,
          authorId: c.authorId,
          name: author?.displayName ?? 'Someone',
          username: author?.username ?? '',
          line: authorLine(author),
          text: c.text,
          at: now - c.minutesAgo * 60_000,
          mine: false,
        };
      })
      .filter((c) => !reported[c.id]);

    const ours: Shown[] = mine.map((c) => ({
      id: c.id,
      authorId: null,
      name: account?.shown.displayName || account?.name || 'You',
      username: account?.shown.username ?? '',
      line: '',
      text: c.text,
      at: c.at,
      mine: true,
    }));

    return [...theirs, ...ours].sort((a, b) => a.at - b.at);
  }, [postId, mine, blocked, reported, account]);

  const send = () => {
    if (!postId || !draft.trim()) return;
    addComment(postId, draft);
    setDraft('');
  };

  const left = COMMENT_MAX_LENGTH - draft.length;

  return (
    <SheetShell visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Text style={styles.sheetTitle}>Comments</Text>
        <View style={styles.rule} />

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {shown.length === 0 ? (
            <Body size={13.5} tone={color.muted} style={{ paddingVertical: 22 }}>
              Nothing here yet. If you have tried this, saying how it went is more use than a like.
            </Body>
          ) : (
            shown.map((c) => (
              <View key={c.id} style={styles.comment}>
                <Avatar name={c.name} seed={c.username || c.name} size={32} />
                <View style={styles.commentBody}>
                  <View style={styles.commentHead}>
                    <Text style={styles.commentName} numberOfLines={1}>
                      {c.name}
                    </Text>
                    {c.mine ? (
                      <Pressable
                        onPress={() => postId && removeComment(postId, c.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Delete your comment"
                        hitSlop={10}
                      >
                        <Text style={styles.delete}>Delete</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => c.authorId && onReport(c.authorId)}
                        accessibilityRole="button"
                        accessibilityLabel={`Report this comment or block @${c.username}`}
                        hitSlop={10}
                      >
                        <Icon name="flag" size={15} tone={color.faint} />
                      </Pressable>
                    )}
                  </View>
                  <MonoLabel size={8.5} em={0.08} tone={color.faint}>
                    {[c.username && `@${c.username}`, c.line, timeAgoLabel(c.at)]
                      .filter(Boolean)
                      .join(' · ')}
                  </MonoLabel>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={(t) => setDraft(t.slice(0, COMMENT_MAX_LENGTH))}
            placeholder="Say how it went"
            placeholderTextColor={color.faint}
            multiline
            maxLength={COMMENT_MAX_LENGTH}
            accessibilityLabel="Write a comment"
            style={styles.input}
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim()}
            accessibilityRole="button"
            accessibilityLabel="Post comment"
            style={[styles.send, { opacity: draft.trim() ? 1 : 0.35 }]}
          >
            <Text style={styles.sendLabel}>Post</Text>
          </Pressable>
        </View>
        {left <= 40 && (
          <MonoLabel size={9} em={0.08} tone={color.muted} style={{ marginTop: 8 }}>
            {`${left} LEFT`}
          </MonoLabel>
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
  scroll: {
    maxHeight: 360,
  },
  comment: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: color.rule,
  },
  commentBody: {
    flex: 1,
    gap: 2,
  },
  commentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commentName: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: color.ink,
  },
  delete: {
    fontSize: 12.5,
    color: color.label,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: color.body,
    marginTop: 4,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.card,
    fontSize: 14.5,
    lineHeight: 20,
    color: color.ink,
    outlineColor: color.accent,
    outlineWidth: 2,
    outlineOffset: 1,
  },
  send: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
