/**
 * The live nearby feed.
 *
 * The v3 design had this as an echo of check-ins — a number and a tag, no words,
 * nothing to answer. It is now what teachers actually say: one sentence, and
 * three reactions to send back.
 *
 * Two of the design's guardrails are deliberately kept. There is still no name
 * on anything, and there is still no reply — a reaction is the whole vocabulary,
 * so a hard day can be met without the feed becoming somewhere to argue or to
 * talk about a colleague. The one-sentence cap is what keeps it a feed of days
 * rather than a message board.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  FeedUpdate,
  FREE_FEED_VIEWS,
  LAST_HOUR_UPDATES,
  NEARBY_UPDATES,
  REACTIONS,
} from '../data/mock';
import { timeAgoLabel } from '../lib/dates';
import { Update, UPDATE_MAX_LENGTH, useStore } from '../store';
import { color, radius } from '../theme';
import { useSheets } from './Sheet';
import { Body, Card, MonoLabel } from './ui';

export function NearbyFeed() {
  const {
    contributing,
    updates,
    reactions,
    postUpdate,
    removeUpdate,
    toggleReaction,
    plusActive,
  } = useStore();
  const { open } = useSheets();
  const [draft, setDraft] = useState('');
  const [showLastHour, setShowLastHour] = useState(false);

  const submit = () => {
    if (!draft.trim()) return;
    postUpdate(draft);
    setDraft('');
  };

  if (!contributing) {
    return (
      <Card style={styles.card}>
        <View style={styles.off}>
          <Body size={13.5} tone={color.muted}>
            The nearby feed reads from the same pool as the map. Turn on “Include my check-ins” to
            see it and to post.
          </Body>
        </View>
      </Card>
    );
  }

  const left = UPDATE_MAX_LENGTH - draft.length;
  const all = showLastHour ? [...NEARBY_UPDATES, ...LAST_HOUR_UPDATES] : NEARBY_UPDATES;
  const total = NEARBY_UPDATES.length + LAST_HOUR_UPDATES.length;
  // Free sees the first few. Reacting to them stays free — answering someone's
  // bad day is not the thing to charge for — but posting and the rest are Plus.
  const sample = plusActive ? all : all.slice(0, FREE_FEED_VIEWS);

  return (
    <Card style={styles.card}>
      {plusActive ? (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={(t) => setDraft(t.slice(0, UPDATE_MAX_LENGTH))}
            placeholder="How was today, in one sentence?"
            placeholderTextColor={color.faint}
            style={styles.input}
            multiline
            maxLength={UPDATE_MAX_LENGTH}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={submit}
            accessibilityLabel="Your update, one sentence"
          />
          <View style={styles.composerFoot}>
            {/* Only speaks up when the cap is close. */}
            <MonoLabel size={9.5} em={0.08} tone={color.muted}>
              {left <= 20 ? `${left} LEFT` : ''}
            </MonoLabel>
            <Pressable
              onPress={submit}
              disabled={!draft.trim()}
              accessibilityRole="button"
              style={[styles.post, { opacity: draft.trim() ? 1 : 0.4 }]}
            >
              <Text style={styles.postLabel}>Post</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Posting to the feed is part of Tended+"
          style={styles.composerLocked}
          onPress={() => open('plus')}
        >
          <Text style={styles.lockedTitle}>Posting is part of Tended+</Text>
        </Pressable>
      )}

      {updates.map((u) => (
        <OwnUpdate key={u.id} update={u} onRemove={() => removeUpdate(u.id)} />
      ))}

      {sample.map((item) => (
        <FeedRow
          key={item.id}
          update={item}
          mine={reactions[item.id] ?? []}
          onReact={(reactionId) => toggleReaction(item.id, reactionId)}
        />
      ))}

      {!plusActive && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Showing ${FREE_FEED_VIEWS} of ${total}. See the whole feed with Tended+`}
          style={styles.gate}
          onPress={() => open('plus')}
        >
          <MonoLabel size={9.5} em={0.1} tone={color.faint}>
            SHOWING {FREE_FEED_VIEWS} OF {total} NEARBY
          </MonoLabel>
          <Text style={styles.gateLabel}>See the whole feed with Tended+ →</Text>
        </Pressable>
      )}

      {plusActive && !showLastHour && (
        <Pressable
          accessibilityRole="button"
          style={styles.more}
          onPress={() => setShowLastHour(true)}
        >
          <Text style={styles.moreLabel}>See the last hour</Text>
        </Pressable>
      )}
    </Card>
  );
}

/** Your own sentence. Nobody else's reactions are simulated, so it says so. */
function OwnUpdate({ update, onRemove }: { update: Update; onRemove: () => void }) {
  return (
    <View style={[styles.row, styles.rowDivider]}>
      <View style={[styles.dot, styles.dotMine]} />
      <View style={styles.copy}>
        <Text style={styles.text}>{update.text}</Text>
        <View style={styles.ownFoot}>
          <MonoLabel size={9.5} em={0} tone={color.faint}>
            YOU · {timeAgoLabel(update.at)}
          </MonoLabel>
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel="Delete your update"
            hitSlop={10}
          >
            <Text style={styles.remove}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function FeedRow({
  update,
  mine,
  onReact,
}: {
  update: FeedUpdate;
  mine: string[];
  onReact: (reactionId: string) => void;
}) {
  return (
    <View style={[styles.row, styles.rowDivider]}>
      <View style={[styles.dot, { backgroundColor: update.dot }]} />
      <View style={styles.copy}>
        <Text style={styles.text}>{update.text}</Text>
        <MonoLabel size={9.5} em={0} tone={color.faint} style={{ marginTop: 4 }}>
          {update.meta}
        </MonoLabel>

        <View style={styles.reactions}>
          {REACTIONS.map((r) => {
            const on = mine.includes(r.id);
            // The user's own tap is counted on top of what the feed already had.
            const count = (update.reactions[r.id] ?? 0) + (on ? 1 : 0);
            return (
              <Pressable
                key={r.id}
                onPress={() => onReact(r.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${r.label}${on ? ', sent' : ''}`}
                style={[styles.reaction, on && styles.reactionOn]}
              >
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                {count > 0 && (
                  <Text style={[styles.reactionCount, on && styles.reactionCountOn]}>{count}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  off: {
    paddingVertical: 16,
  },
  composer: {
    paddingTop: 14,
    paddingBottom: 4,
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.ground,
    fontSize: 14,
    lineHeight: 20,
    color: color.ink,
    // The web build's default focus ring is heavy black against a paper
    // palette. Recoloured rather than removed, so it still reads for anyone
    // arriving by keyboard.
    outlineColor: color.accent,
    outlineWidth: 2,
    outlineOffset: 1,
  },
  composerLocked: {
    marginTop: 14,
    marginBottom: 12,
    padding: 14,
    borderRadius: radius.row,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.outline,
    backgroundColor: color.ground,
  },
  lockedTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: color.ink,
  },
  gate: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: color.rule,
    gap: 5,
  },
  gateLabel: {
    fontSize: 13.5,
    color: color.accent,
  },
  composerFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 10,
  },
  post: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    marginTop: 6,
  },
  dotMine: {
    borderWidth: 1,
    borderColor: color.accentBorderSoft,
    backgroundColor: 'transparent',
  },
  copy: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    lineHeight: 21,
    color: color.ink,
  },
  ownFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  remove: {
    fontSize: 12.5,
    color: color.label,
  },
  reactions: {
    flexDirection: 'row',
    // All three fit one row at the device width; wrapping is only a safety net
    // for a larger text scale.
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 10,
  },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
  },
  reactionOn: {
    borderColor: color.accentBorderSoft,
    backgroundColor: 'rgba(23,96,107,0.06)',
  },
  reactionEmoji: {
    fontSize: 17,
    lineHeight: 22,
  },
  reactionCount: {
    fontSize: 12,
    color: color.faint,
  },
  reactionCountOn: {
    color: color.accent,
  },
  more: {
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  moreLabel: {
    fontSize: 13.5,
    color: color.accent,
  },
});
