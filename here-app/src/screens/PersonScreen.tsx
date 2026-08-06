/**
 * One person, and everything they have posted.
 *
 * The feed was missing this. You could read a sentence, decide the person
 * writing it knew the job, tap Follow — and then have no way to see anything
 * else they had ever said. A follow made on one line of evidence is a guess,
 * and the Following tab only pays out on what they post *next*. This is the
 * back catalogue: who they are, and every post of theirs the app has.
 *
 * It is reached by tapping a name or an avatar anywhere a post is drawn, and it
 * is a layer over the tabs rather than a fourth tab — you arrive from a post and
 * you go back to it, which is what Back means here.
 *
 * ─── Your own page ───────────────────────────────────────────────────────────
 *
 * `authorId === null` is you. The same page, drawn from the store instead of
 * from the sample directory: your byline as you chose to show it, your posts,
 * each of them still editable and deletable exactly as in the feed. There is no
 * Follow button on it, and no flag.
 *
 * What it deliberately does not show — on your page or anyone else's — is the
 * check-in record. Those numbers live on the Profile tab and never leave the
 * phone; a page that published them would break the promise the whole app rests
 * on the moment someone else could load it.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { FeedCard, OwnPost } from '../components/PostCard';
import { useSheets } from '../components/Sheet';
import { Card, MonoLabel } from '../components/ui';
import { AUTHORS, authorLine, SAMPLE_COMMENTS, yearsLabel } from '../data/mock';
import { BACKEND_CONFIGURED } from '../lib/backend';
import { authorOf } from '../lib/feedSource';
import { useFeedPosts } from '../lib/useFeedPosts';
import { useStore } from '../store';
import { color } from '../theme';

export function PersonScreen({
  authorId,
  onBack,
  onComments,
}: {
  /** Whose page. `null` is the signed-in teacher's own. */
  authorId: string | null;
  onBack: () => void;
  onComments?: (postId: string) => void;
}) {
  const {
    account,
    updates,
    editUpdate,
    removeUpdate,
    likes,
    toggleLike,
    reposts,
    toggleRepost,
    comments,
    practices,
    saveToList,
    following,
    follow,
    unfollow,
    listFull,
    reported,
    blocked,
  } = useStore();
  const { open } = useSheets();

  const mine = authorId === null;

  /**
   * Their posts. `authorId` is null on your own page, and with a server your
   * posts are just posts by you — so the query is the same one, aimed at your
   * own id, which the feed already told us via `mine`.
   *
   * Hooks cannot sit behind the early return below, so this runs even for a
   * blocked account. It costs one request that returns nothing, and the
   * alternative is a conditional hook.
   */
  const source = useFeedPosts({ kind: 'person', authorId: authorId ?? '' });

  const author = authorId
    ? // From the server when its posts carried it, from the samples otherwise.
      (source.posts.map(authorOf).find((a) => a?.id === authorId) ?? AUTHORS[authorId])
    : undefined;

  // A blocked account's page is not a way around the block, and a page for
  // somebody who does not exist is a bug rather than an empty state.
  if (!mine && (!author || blocked.includes(author.id))) {
    return (
      <View>
        <BackRow onBack={onBack} />
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {author ? 'You blocked this account' : 'No such account'}
          </Text>
        </Card>
      </View>
    );
  }

  const shown = account?.shown;
  const displayName = mine
    ? shown?.displayName || account?.name || 'You'
    : (author?.displayName ?? '');
  const username = mine ? (shown?.username ?? '') : (author?.username ?? '');
  const byline = mine
    ? [
        shown?.showJob && shown.job,
        shown?.showLevel && shown.level,
        shown?.showState && shown.state,
        shown?.showYears ? yearsLabel(shown.years) : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : authorLine(author);

  /**
   * Offline, your own page draws from the store's `updates` and everyone else's
   * from the fixtures. Online there is one source: the posts the server returned
   * for this id, minus anything you reported.
   */
  const theirs = source.posts.filter((u) => !reported[u.id]);
  const remoteMine = BACKEND_CONFIGURED ? theirs.filter((u) => u.mine) : [];
  const isFollowing = !!author && following.includes(author.id);
  const onList = new Set(practices.map((p) => p.label));
  const count = BACKEND_CONFIGURED
    ? (mine ? remoteMine.length : theirs.length)
    : mine
      ? updates.length
      : theirs.length;

  return (
    <View>
      <BackRow onBack={onBack} />

      <View style={styles.head}>
        <Avatar name={displayName || '?'} seed={username || displayName || 'you'} size={56} />
        <View style={styles.headText}>
          <Text style={styles.name}>{displayName}</Text>
          <MonoLabel size={9} em={0.08} tone={color.faint} style={{ marginTop: 5 }}>
            {[username && `@${username}`, byline].filter(Boolean).join(' · ')}
          </MonoLabel>
        </View>
      </View>

      {!mine && !!author && (
        <Pressable
          onPress={() => (isFollowing ? unfollow(author.id) : follow(author.id))}
          accessibilityRole="button"
          accessibilityState={{ selected: isFollowing }}
          accessibilityLabel={isFollowing ? `Unfollow @${username}` : `Follow @${username}`}
          style={[styles.follow, isFollowing && styles.followOn]}
        >
          <Text style={[styles.followLabel, isFollowing && styles.followLabelOn]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      )}

      <MonoLabel style={{ marginTop: 28 }}>
        {count === 1 ? '1 POST' : `${count} POSTS`}
      </MonoLabel>

      {count === 0 && (
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {mine ? 'You have not posted yet' : 'Nothing here yet'}
          </Text>
        </Card>
      )}

      {mine &&
        !BACKEND_CONFIGURED &&
        updates.map((u) => (
          <OwnPost
            key={u.id}
            update={u}
            name={displayName}
            username={username}
            line={byline}
            likeCount={likes.includes(u.id) ? 1 : 0}
            repostCount={reposts.includes(u.id) ? 1 : 0}
            commentCount={(comments[u.id] ?? []).length}
            onComments={() => onComments?.(u.id)}
            onEdit={(text) => editUpdate(u.id, text)}
            onRemove={() => removeUpdate(u.id)}
            onOwnPage
          />
        ))}

      {mine &&
        BACKEND_CONFIGURED &&
        remoteMine.map((post) => (
          <OwnPost
            key={post.id}
            update={{
              id: post.id,
              text: post.text,
              at: Date.now(),
              ...(post.photo ? { photo: post.photo } : {}),
              ...(post.editedAt ? { editedAt: post.editedAt } : {}),
            }}
            name={displayName}
            username={username}
            line={post.meta}
            likeCount={post.counts.like ?? 0}
            repostCount={post.counts.repost ?? 0}
            commentCount={source.commentCounts?.[post.id] ?? 0}
            onComments={() => onComments?.(post.id)}
            onEdit={(text) => editUpdate(post.id, text)}
            onRemove={() => removeUpdate(post.id)}
            onOwnPage
          />
        ))}

      {!mine &&
        theirs.map((post) => (
          <FeedCard
            key={post.id}
            update={post}
            liked={(source.liked ?? likes).includes(post.id)}
            reposted={(source.reposted ?? reposts).includes(post.id)}
            commentCount={
              source.commentCounts?.[post.id] ??
              (SAMPLE_COMMENTS[post.id] ?? []).length + (comments[post.id] ?? []).length
            }
            saved={onList.has(post.text)}
            locked={listFull && !onList.has(post.text)}
            onSave={() => (listFull ? open('plus') : saveToList(post.text))}
            onLike={() => toggleLike(post.id)}
            onRepost={() => toggleRepost(post.id)}
            onComments={() => onComments?.(post.id)}
            onReport={() => open('report', { updateId: post.id, authorId: post.authorId })}
            following={isFollowing}
            onFollow={() => (isFollowing ? unfollow(post.authorId) : follow(post.authorId))}
            // Already on this person's page: no name link back to it, and no
            // second Follow under every post.
            onOwnPage
          />
        ))}
    </View>
  );
}

function BackRow({ onBack }: { onBack: () => void }) {
  return (
    <Pressable
      onPress={onBack}
      accessibilityRole="button"
      accessibilityLabel="Back to the feed"
      hitSlop={10}
      style={styles.back}
    >
      <Text style={styles.backLabel}>← Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  backLabel: {
    fontSize: 14,
    color: color.accent,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 14,
  },
  headText: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '600',
    color: color.ink,
  },
  follow: {
    height: 42,
    marginTop: 18,
    borderRadius: 12,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followOn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: color.outline,
  },
  followLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  followLabelOn: {
    color: color.body,
  },
  empty: {
    marginTop: 12,
    padding: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: color.ink,
  },
});
