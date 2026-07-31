/**
 * The main page. Everything the app asks of a teacher on a given day happens
 * here, in this order:
 *
 *   1. How are you feeling? — five faces, one tap, saved on the tap.
 *   2. What did you do for yourself? — one sentence, optionally a photo.
 *   3. What everyone else did — react to it, or save it onto your own list.
 *
 * The structure is a response to the sharpest piece of teacher feedback the
 * project has had: "if I had to choose between filling out this tool and
 * lighting a candle and sitting quietly for three minutes, I would not choose
 * the tool." So the tool costs one tap, there is no save button to reach, and
 * what comes back is other teachers' actual moves rather than advice.
 *
 * Two guardrails from the original design survive. Nothing carries a name, and
 * there are no replies — a reaction is the whole vocabulary, so the feed cannot
 * turn into somewhere to argue or to talk about a colleague.
 */

import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PlacementCard, withPlacements } from '../components/Placements';
import { useSheets } from '../components/Sheet';
import { Body, Card, Display, MonoLabel } from '../components/ui';
import { FeedUpdate, LAST_HOUR_UPDATES, NEARBY_UPDATES, REACTIONS } from '../data/mock';
import { longDateLabel, timeAgoLabel, todayISO } from '../lib/dates';
import { PICKER_CONFIGURED, pickPhoto } from '../lib/photo';
import { Update, UPDATE_MAX_LENGTH, useStore } from '../store';
import { color, MOODS, radius } from '../theme';

export function FeedScreen() {
  const {
    entries,
    saveCheckIn,
    updates,
    postUpdate,
    removeUpdate,
    reactions,
    toggleReaction,
    practices,
    saveToList,
    educator,
  } = useStore();
  const { open } = useSheets();

  const today = todayISO();
  const mood = entries[today]?.score ?? null;

  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // What is already on the list, so a row can say so instead of saving twice.
  const onList = new Set(practices.map((p) => p.label));

  const attach = async () => {
    setPicking(true);
    const picked = await pickPhoto();
    setPicking(false);
    if (picked) setPhoto(picked);
  };

  const submit = () => {
    if (!draft.trim()) return;
    postUpdate(draft, photo);
    setDraft('');
    setPhoto(null);
  };

  const feed = showMore ? [...NEARBY_UPDATES, ...LAST_HOUR_UPDATES] : NEARBY_UPDATES;
  const left = UPDATE_MAX_LENGTH - draft.length;

  return (
    <View>
      <MonoLabel>{longDateLabel()}</MonoLabel>
      <Display size={32} style={{ marginTop: 10 }}>
        How are you feeling?
      </Display>

      {/* Saved on the tap. No confirm step, nothing to come back and finish. */}
      <View style={styles.moods}>
        {MOODS.map((m, i) => {
          const on = mood === i + 1;
          return (
            <Pressable
              key={m.label}
              onPress={() => saveCheckIn(i + 1)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={m.label}
              style={[
                styles.mood,
                on && { borderColor: m.color, backgroundColor: color.card, borderWidth: 2 },
              ]}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.moodCaption}>
        {mood === null ? 'Tap one. That is the whole check-in.' : `Saved — ${MOODS[mood - 1].label}.`}
      </Text>

      {/* The composer. Posting is the app's supply of content, so it is not
          gated on Tended+ — only on having shown you teach, which is what keeps
          the feed teachers-only. */}
      {educator.verified ? (
        <Card style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={(t) => setDraft(t.slice(0, UPDATE_MAX_LENGTH))}
            placeholder="What did you do for yourself today?"
            placeholderTextColor={color.faint}
            style={styles.input}
            multiline
            maxLength={UPDATE_MAX_LENGTH}
            accessibilityLabel="What you did for yourself, one sentence"
          />

          {photo && (
            <View style={styles.attachment}>
              <Image source={{ uri: photo }} style={styles.attachmentImage} resizeMode="cover" />
              <Pressable
                onPress={() => setPhoto(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                style={styles.attachmentRemove}
              >
                <Text style={styles.attachmentRemoveLabel}>Remove</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.composerFoot}>
            {PICKER_CONFIGURED ? (
              <Pressable
                onPress={attach}
                disabled={picking}
                accessibilityRole="button"
                accessibilityLabel="Add a photo"
                style={styles.attach}
              >
                {picking ? (
                  <ActivityIndicator size="small" color={color.muted} />
                ) : (
                  <Text style={styles.attachLabel}>{photo ? 'Replace photo' : '+ Photo'}</Text>
                )}
              </Pressable>
            ) : (
              <View />
            )}

            <View style={styles.composerRight}>
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
        </Card>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Verify you are an educator to post"
          onPress={() => open('verify')}
        >
          <Card style={styles.locked}>
            <Text style={styles.lockedTitle}>Verify to post</Text>
            <Text style={styles.lockedSub}>
              Reading and saving are open to everyone. Posting is verified educators only, so the
              feed stays teachers talking to teachers.
            </Text>
          </Card>
        </Pressable>
      )}

      {updates.map((u) => (
        <OwnPost key={u.id} update={u} onRemove={() => removeUpdate(u.id)} />
      ))}

      {/* Posts with the placement rack dealt in — the Tended Collective shelf
          first, then the sold slots. See components/Placements.tsx. */}
      {withPlacements(feed).map((row, i) =>
        'post' in row ? (
          <FeedCard
            key={row.post.id}
            update={row.post}
            mine={reactions[row.post.id] ?? []}
            saved={onList.has(row.post.text)}
            onSave={() => saveToList(row.post.text)}
            onReact={(id) => toggleReaction(row.post.id, id)}
          />
        ) : (
          <PlacementCard key={`p${i}`} placement={row.placement} />
        ),
      )}

      <Body size={12} lineHeight={1.6} tone={color.label} style={{ marginTop: 14 }}>
        Sponsored placements are labeled. Sponsors fund the free plan and never receive your data.
        Opening one is not logged or shared.
      </Body>

      {!showMore && (
        <Pressable accessibilityRole="button" style={styles.more} onPress={() => setShowMore(true)}>
          <Text style={styles.moreLabel}>See earlier today</Text>
        </Pressable>
      )}
    </View>
  );
}

/** This teacher's own post. Nobody else's reactions are simulated onto it. */
function OwnPost({ update, onRemove }: { update: Update; onRemove: () => void }) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardHead}>
        <View style={[styles.dot, styles.dotMine]} />
        <MonoLabel size={9.5} em={0.08} tone={color.faint}>
          YOU · {timeAgoLabel(update.at)}
        </MonoLabel>
        <View style={styles.headSpacer} />
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel="Delete your post"
          hitSlop={10}
        >
          <Text style={styles.remove}>Delete</Text>
        </Pressable>
      </View>

      <Text style={styles.text}>{update.text}</Text>
      {update.photo && (
        <Image source={{ uri: update.photo }} style={styles.photo} resizeMode="cover" />
      )}
    </Card>
  );
}

function FeedCard({
  update,
  mine,
  saved,
  onSave,
  onReact,
}: {
  update: FeedUpdate;
  mine: string[];
  saved: boolean;
  onSave: () => void;
  onReact: (reactionId: string) => void;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardHead}>
        <View style={[styles.dot, { backgroundColor: update.dot }]} />
        <MonoLabel size={9.5} em={0.08} tone={color.faint}>
          {update.streak ? `${update.streak} · ${update.meta}` : update.meta}
        </MonoLabel>
      </View>

      <Text style={styles.text}>{update.text}</Text>
      {update.photo && (
        <Image
          source={{ uri: update.photo }}
          style={styles.photo}
          resizeMode="cover"
          accessibilityLabel="Photo attached to this post"
        />
      )}

      <View style={styles.actions}>
        {REACTIONS.map((r) => {
          const on = mine.includes(r.id);
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

      {/* The reason the feed exists: you can take the thing, not just read it. */}
      <Pressable
        onPress={onSave}
        disabled={saved}
        accessibilityRole="button"
        accessibilityLabel={saved ? 'Already on your list' : `Save "${update.text}" to your list`}
        style={[styles.save, saved && styles.saveDone]}
      >
        <Text style={[styles.saveLabel, saved && styles.saveLabelDone]}>
          {saved ? '✓ On your list' : '+ Save to my list'}
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  moods: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  mood: {
    flex: 1,
    height: 62,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.hairline,
    backgroundColor: color.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 27,
    lineHeight: 34,
  },
  moodCaption: {
    fontSize: 12.5,
    color: color.label,
    marginTop: 10,
  },
  composer: {
    marginTop: 22,
    padding: 14,
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
    outlineColor: color.accent,
    outlineWidth: 2,
    outlineOffset: 1,
  },
  attachment: {
    marginTop: 12,
  },
  attachmentImage: {
    width: '100%',
    height: 170,
    borderRadius: radius.row,
    backgroundColor: color.track,
  },
  attachmentRemove: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  attachmentRemoveLabel: {
    fontSize: 12.5,
    color: color.label,
  },
  composerFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  composerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attach: {
    height: 36,
    minWidth: 84,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachLabel: {
    fontSize: 13.5,
    color: color.ink,
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
  locked: {
    marginTop: 22,
    padding: 16,
    borderStyle: 'dashed',
  },
  lockedTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: color.ink,
  },
  lockedSub: {
    fontSize: 12.5,
    lineHeight: 19,
    color: color.muted,
    marginTop: 4,
  },
  card: {
    marginTop: 12,
    padding: 16,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 10,
  },
  headSpacer: {
    flex: 1,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 99,
  },
  dotMine: {
    borderWidth: 1,
    borderColor: color.accentBorderSoft,
    backgroundColor: 'transparent',
  },
  remove: {
    fontSize: 12.5,
    color: color.label,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: color.ink,
  },
  photo: {
    width: '100%',
    height: 190,
    marginTop: 12,
    borderRadius: radius.row,
    backgroundColor: color.track,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
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
  save: {
    height: 40,
    marginTop: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.accentBorderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDone: {
    borderColor: color.outline,
  },
  saveLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: color.accent,
  },
  saveLabelDone: {
    fontWeight: '400',
    color: color.faint,
  },
  more: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  moreLabel: {
    fontSize: 13.5,
    color: color.accent,
  },
});
