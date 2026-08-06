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
 * Posts carry the teacher's name now. The anonymity was right for a feed of bad
 * days, where the exposure was a colleague identified complaining about their
 * school; it is wrong for a feed of what people did for themselves, because you
 * cannot follow a stranger, and knowing who is saying it — their job, their
 * years in it — is most of why it is worth reading.
 *
 * What a post never carries is anything derived from the check-in record. The
 * record stays on the phone, and that includes counts drawn from it.
 *
 * The no-replies guardrail is gone. It held for a long time — a reaction was the
 * whole vocabulary, so a post had nothing to argue under it — and it is given up
 * deliberately, because the follow-up a reaction cannot carry is most of what
 * makes someone else's practice usable: how long it took to stick, what their
 * principal said, what to do when it fails. What replaces it is moderation, on
 * comments as much as on posts. See components/CommentsSheet.tsx.
 *
 * Private messages were built and then removed. They are a later rollout.
 *
 * The cards are flat rows rather than raised cards — avatar in a left column,
 * everything else stacked in a right one, hairline between posts. A feed of
 * white cards on a near-white ground spends a lot of ink drawing boxes, and the
 * boxes are not the content.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PlacementCard, withPlacements } from '../components/Placements';
import { FeedCard, OwnPost } from '../components/PostCard';
import { useSheets } from '../components/Sheet';
import { Card, Display, MonoLabel } from '../components/ui';
import { AUTHORS, SAMPLE_COMMENTS, yearsLabel } from '../data/mock';
import { BACKEND_CONFIGURED } from '../lib/backend';
import { authorOf } from '../lib/feedSource';
import { useFeedPosts } from '../lib/useFeedPosts';
import { longDateLabel } from '../lib/dates';
import { useToday } from '../lib/useToday';
import { isNearby } from '../lib/zip';
import { CAMERA_AVAILABLE, PICKER_CONFIGURED, pickPhoto, takePhoto } from '../lib/photo';
import { UPDATE_MAX_LENGTH, useStore } from '../store';
import { color, MOODS, radius } from '../theme';

/**
 * Three ways to narrow the feed.
 *
 * Everywhere is the default because on day one it is the only one with
 * anything in it. Near my school matches on the first three digits of the
 * school ZIP — roughly a metro or a rural county, which is the scale at which
 * "near me" is true without being tight enough to name a building. Following is
 * the list you built yourself.
 */
type Scope = 'everywhere' | 'nearby' | 'following';

const SCOPES: { key: Scope; label: string }[] = [
  { key: 'everywhere', label: 'Everywhere' },
  { key: 'nearby', label: 'Near my school' },
  { key: 'following', label: 'Following' },
];

export function FeedScreen({
  composeAt = 0,
  onComments,
  onOpenAuthor,
}: {
  composeAt?: number;
  /** Open the comments for a post. The sheet is mounted by the shell. */
  onComments?: (postId: string) => void;
  /** Open one person's page. `null` means your own. */
  onOpenAuthor?: (authorId: string | null) => void;
}) {
  const {
    entries,
    saveCheckIn,
    updates,
    postUpdate,
    editUpdate,
    removeUpdate,
    likes,
    toggleLike,
    reposts,
    toggleRepost,
    comments,
    practices,
    saveToList,
    educator,
    account,
    following,
    follow,
    unfollow,
    listFull,
    reported,
    blocked,
  } = useStore();
  const { open } = useSheets();

  // Not `todayISO()` inline: the check-in itself is always written against the
  // real date, but the face shown as selected and the date at the top of the
  // page would otherwise still say yesterday on a phone left open overnight.
  const today = useToday();
  const mood = entries[today]?.score ?? null;

  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [scope, setScope] = useState<Scope>('everywhere');

  // The + in the tab bar lands here. It only ever focuses the box — it never
  // posts, and it never opens a separate compose screen, because the box is
  // already on the first screen and a modal over it would be one more thing to
  // dismiss.
  const composer = useRef<TextInput>(null);
  useEffect(() => {
    if (composeAt > 0) composer.current?.focus();
  }, [composeAt]);

  // What is already on the list, so a row can say so instead of saving twice.
  const onList = new Set(practices.map((p) => p.label));

  /**
   * Two ways in, one result. `take` opens the camera and `attach` opens the
   * library; both come back as a downscaled, EXIF-stripped data URI, so the
   * composer does not care which one produced it.
   */
  const usePicker = async (pick: () => Promise<string | null>) => {
    setPicking(true);
    const picked = await pick();
    setPicking(false);
    if (picked) setPhoto(picked);
  };
  const attach = () => usePicker(pickPhoto);
  const take = () => usePicker(takePhoto);

  const submit = () => {
    if (!draft.trim()) return;
    postUpdate(draft, photo);
    setDraft('');
    setPhoto(null);
  };

  const myZip = account?.shown.zip ?? '';

  /**
   * The posts, from the server when there is one and from the samples when
   * there is not. Both arrive as the same shape — see lib/useFeedPosts.ts.
   */
  const source = useFeedPosts({ kind: 'feed', scope, zip: myZip, expanded: showMore });

  const all = source.posts
    // Reported and blocked come out before anything else looks at the list, so
    // there is no path — scope switch, expansion, placement dealing — that can
    // put one back on screen. The server enforces both as well (schema.sql), so
    // this is the local half of a rule that holds in two places.
    .filter((u) => !reported[u.id] && !blocked.includes(u.authorId));

  /**
   * The scope filters only run locally. With a server the query already did
   * them — `nearby` is a ZIP-prefix match in Postgres and `following` is a join
   * — and re-filtering here against the device's own follow list would drop
   * posts the server correctly included.
   */
  const feed = BACKEND_CONFIGURED
    ? all
    : scope === 'following'
      ? all.filter((u) => following.includes(u.authorId))
      : scope === 'nearby'
        ? all.filter((u) => isNearby(myZip, AUTHORS[u.authorId]?.zip))
        : all;

  /** Reactions: the server's answer when it gave one, the device's otherwise. */
  const isLiked = (id: string) => (source.liked ?? likes).includes(id);
  const isReposted = (id: string) => (source.reposted ?? reposts).includes(id);
  const commentsOn = (id: string) =>
    source.commentCounts?.[id] ??
    (SAMPLE_COMMENTS[id] ?? []).length + (comments[id] ?? []).length;

  const left = UPDATE_MAX_LENGTH - draft.length;

  return (
    <View>
      <MonoLabel>{longDateLabel(new Date(`${today}T12:00:00`))}</MonoLabel>
      <Display size={32} style={{ marginTop: 10 }}>
        How are you feeling today?
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
      {/* Nothing before the tap — the five faces under a question do not need
          to be explained. After it, the line is confirmation rather than
          instruction: there is no save button, so something has to say the day
          was written. */}
      {mood !== null && <Text style={styles.moodCaption}>Saved — {MOODS[mood - 1].label}.</Text>}

      {/* The composer. Posting is the app's supply of content, so it is not
          gated on Here+ — only on having shown you teach, which is what keeps
          the feed teachers-only. */}
      {educator.verified ? (
        <Card style={styles.composer}>
          {/* The question is asked out loud rather than hidden in the
              placeholder, where it disappears the moment someone starts
              typing — and where a screen reader may never announce it. */}
          <Text style={styles.composerQuestion}>How did you take care of yourself today?</Text>
          <TextInput
            ref={composer}
            value={draft}
            onChangeText={(t) => setDraft(t.slice(0, UPDATE_MAX_LENGTH))}
            style={styles.input}
            multiline
            maxLength={UPDATE_MAX_LENGTH}
            accessibilityLabel="How did you take care of yourself today? One sentence."
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
            {/* Take one or choose one, as two buttons rather than one button
                that opens a menu asking which. The composer asks about today,
                and the answer is often in front of the person right now — the
                camera should not be a tap deeper than the library. Both go
                through the same downscale and EXIF strip (lib/photo.ts). */}
            {PICKER_CONFIGURED ? (
              <View style={styles.attachRow}>
                {picking ? (
                  <View style={styles.attach}>
                    <ActivityIndicator size="small" color={color.muted} />
                  </View>
                ) : (
                  <>
                    {CAMERA_AVAILABLE && (
                      <Pressable
                        onPress={take}
                        accessibilityRole="button"
                        accessibilityLabel="Take a photo"
                        style={styles.attach}
                      >
                        <Text style={styles.attachLabel}>Take photo</Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={attach}
                      accessibilityRole="button"
                      accessibilityLabel={
                        CAMERA_AVAILABLE ? 'Choose a photo from your library' : 'Add a photo'
                      }
                      style={styles.attach}
                    >
                      <Text style={styles.attachLabel}>
                        {CAMERA_AVAILABLE ? 'Choose' : photo ? 'Replace photo' : '+ Photo'}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
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
          accessibilityLabel="Verify you work in a school to post"
          onPress={() => open('verify')}
        >
          <Card style={styles.locked}>
            <Text style={styles.lockedTitle}>Verify to post</Text>
            <Text style={styles.lockedSub}>
              Reading and saving are open to everyone. Posting is verified school staff only —
              teachers, counselors, paraeducators, administrators — so the feed stays people who
              are actually in the building.
            </Text>
          </Card>
        </Pressable>
      )}

      <View style={styles.scope}>
        {SCOPES.map(({ key, label }) => {
          const on = scope === key;
          return (
            <Pressable
              key={key}
              onPress={() => setScope(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.scopeTab, on && styles.scopeTabOn]}
            >
              <Text style={[styles.scopeLabel, on && styles.scopeLabelOn]}>
                {key === 'following' && following.length ? `${label} · ${following.length}` : label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Loading and failure, but only where there is a server to be slow or to
          fail. Offline the list is a constant and neither can happen. */}
      {source.loading && feed.length === 0 && (
        <View style={styles.feedState}>
          <ActivityIndicator size="small" color={color.faint} />
        </View>
      )}
      {!!source.error && (
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>The feed did not load</Text>
          <Text style={styles.emptySub}>{source.error} Pull down to try again.</Text>
        </Card>
      )}

      {/* Your own posts, from the device.

          Only when there is no server. With one, your posts come back inside
          the feed itself carrying `mine`, and are drawn below by the same map as
          everyone else's — rendering both would show each post twice, once with
          the id this app invented and once with the id the database gave it. */}
      {!BACKEND_CONFIGURED &&
        scope === 'everywhere' &&
        updates.map((u) => (
          <OwnPost
            key={u.id}
            update={u}
            name={account?.shown.displayName || account?.name || 'You'}
            username={account?.shown.username ?? ''}
            line={[
              account?.shown.showJob && account.shown.job,
              account?.shown.showLevel && account.shown.level,
              account?.shown.showState && account.shown.state,
              account?.shown.showYears ? yearsLabel(account.shown.years) : '',
            ]
              .filter(Boolean)
              .join(' · ')}
            likeCount={likes.includes(u.id) ? 1 : 0}
            repostCount={reposts.includes(u.id) ? 1 : 0}
            commentCount={(comments[u.id] ?? []).length}
            onComments={() => onComments?.(u.id)}
            onEdit={(text) => editUpdate(u.id, text)}
            onRemove={() => removeUpdate(u.id)}
            onOpenAuthor={() => onOpenAuthor?.(null)}
          />
        ))}

      {/* Each empty view says why it is empty, since the three go blank for
          three different reasons and only one of them is fixable by scrolling. */}
      {scope === 'following' && feed.length === 0 && (
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>You are not following anyone yet</Text>
          <Text style={styles.emptySub}>
            Tap Follow on someone whose posts you want to keep seeing. They show up here.
          </Text>
        </Card>
      )}

      {scope === 'nearby' && !myZip && (
        <Pressable accessibilityRole="button" onPress={() => open('verify')}>
          <Card style={styles.empty}>
            <Text style={styles.emptyTitle}>Add your school ZIP</Text>
            <Text style={styles.emptySub}>
              This view shows people who work near you. Add your school’s ZIP on your profile to
              switch it on.
            </Text>
          </Card>
        </Pressable>
      )}

      {scope === 'nearby' && !!myZip && feed.length === 0 && (
        <Card style={styles.empty}>
          {/* No "we have not launched in your state yet". The app is national
              from day one and every post is already readable from anywhere —
              this tab is a filter, not a region, so the empty state points at
              the filter rather than implying a rollout. */}
          <Text style={styles.emptyTitle}>Nobody near you has posted yet</Text>
          <Text style={styles.emptySub}>
            Near my school only shows people who work close to your ZIP. Tap Everywhere for the
            full feed.
          </Text>
        </Card>
      )}

      {/* Posts with the placement rack dealt in — the Tended Collective shelf
          first, then the sold slots. See components/Placements.tsx. */}
      {withPlacements(feed).map((row, i) =>
        !('post' in row) ? (
          <PlacementCard key={`p${i}`} placement={row.placement} />
        ) : row.post.mine ? (
          // Your own post, arrived from the server. Same row the local branch
          // above draws, so editing and deleting look identical either way —
          // but the id is the database's, which is what makes them work.
          <OwnPost
            key={row.post.id}
            update={{
              id: row.post.id,
              text: row.post.text,
              at: Date.now(),
              ...(row.post.photo ? { photo: row.post.photo } : {}),
              ...(row.post.editedAt ? { editedAt: row.post.editedAt } : {}),
            }}
            name={authorOf(row.post)?.displayName ?? 'You'}
            username={authorOf(row.post)?.username ?? ''}
            line={row.post.meta}
            likeCount={row.post.counts.like ?? 0}
            repostCount={row.post.counts.repost ?? 0}
            commentCount={commentsOn(row.post.id)}
            onComments={() => onComments?.(row.post.id)}
            onEdit={(text) => editUpdate(row.post.id, text)}
            onRemove={() => removeUpdate(row.post.id)}
            onOpenAuthor={() => onOpenAuthor?.(null)}
          />
        ) : (
          <FeedCard
            key={row.post.id}
            update={row.post}
            liked={isLiked(row.post.id)}
            reposted={isReposted(row.post.id)}
            commentCount={commentsOn(row.post.id)}
            saved={onList.has(row.post.text)}
            locked={listFull && !onList.has(row.post.text)}
            onSave={() => (listFull ? open('plus') : saveToList(row.post.text))}
            onLike={() => toggleLike(row.post.id)}
            onRepost={() => toggleRepost(row.post.id)}
            onComments={() => onComments?.(row.post.id)}
            onReport={() =>
              open('report', { updateId: row.post.id, authorId: row.post.authorId })
            }
            following={following.includes(row.post.authorId)}
            onFollow={() =>
              following.includes(row.post.authorId)
                ? unfollow(row.post.authorId)
                : follow(row.post.authorId)
            }
            onOpenAuthor={(id) => onOpenAuthor?.(id)}
          />
        ),
      )}


      {/* Only for the fixtures, which are a fixed list of seven split in two.
          Against a server this is a second page, and offering it before paging
          exists would be a button that does nothing. */}
      {!BACKEND_CONFIGURED && !showMore && (
        <Pressable accessibilityRole="button" style={styles.seeMore} onPress={() => setShowMore(true)}>
          <Text style={styles.moreLabel}>See earlier today</Text>
        </Pressable>
      )}
    </View>
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
  composerQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: color.ink,
    marginBottom: 10,
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
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  scope: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 22,
  },
  scopeTab: {
    height: 34,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    justifyContent: 'center',
  },
  scopeTabOn: {
    backgroundColor: color.ink,
    borderColor: color.ink,
  },
  scopeLabel: {
    fontSize: 13,
    color: color.body,
  },
  scopeLabelOn: {
    color: '#fff',
    fontWeight: '600',
  },
  empty: {
    marginTop: 12,
    padding: 16,
  },
  feedState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: color.ink,
  },
  emptySub: {
    fontSize: 12.5,
    lineHeight: 19,
    color: color.muted,
    marginTop: 4,
  },
  seeMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  moreLabel: {
    fontSize: 13.5,
    color: color.accent,
  },
});
