/**
 * One post, in the two forms it comes in: somebody else's, and your own.
 *
 * These lived inside FeedScreen until a person's own page needed to draw the
 * same rows. Two copies of a post row is how a feed ends up with a Follow
 * button that works in one place and not the other, so they moved here and both
 * screens import them.
 *
 * ─── What changed when they moved ────────────────────────────────────────────
 *
 * The name and the avatar are now a button. Tapping them opens that person's
 * page — everything they have posted, in one place — which is the thing a feed
 * of *people* was missing: you could follow someone on the strength of one
 * sentence and then never find the rest.
 *
 * Your own post carries the same reaction row everyone else's does, rather than
 * a bare Delete link. Posting into a feed and being shown nothing back is the
 * one interaction here with no answer to "did anybody see it".
 *
 * And your own post can be rewritten. The id survives the edit, so the comments
 * already under it stay attached — which is exactly why an edited post says
 * EDITED. A sentence that quietly changes after people have replied to it turns
 * their replies into answers to something nobody said.
 */

import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { MonoLabel } from './ui';
import { authorLine, FeedUpdate, POST_ACTIONS } from '../data/mock';
import { authorOf } from '../lib/feedSource';
import { timeAgoLabel } from '../lib/dates';
import { Update, UPDATE_MAX_LENGTH } from '../store';
import { color, radius } from '../theme';

/** This teacher's own post. Nobody else's reactions are simulated onto it. */
export function OwnPost({
  update,
  name,
  username,
  line,
  likeCount,
  repostCount,
  commentCount,
  onComments,
  onEdit,
  onRemove,
  onOpenAuthor,
  /** True on your own page, where the header already carries name and byline. */
  onOwnPage = false,
}: {
  update: Update;
  name: string;
  username: string;
  line: string;
  likeCount: number;
  repostCount: number;
  commentCount: number;
  onComments: () => void;
  onEdit: (text: string) => void;
  onRemove: () => void;
  onOpenAuthor?: () => void;
  onOwnPage?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(update.text);

  const save = () => {
    if (draft.trim()) onEdit(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(update.text);
    setEditing(false);
  };

  return (
    <View style={styles.row}>
      <Avatar name={name} seed={username || name} size={38} />

      <View style={styles.rowBody}>
        <View style={styles.nameRow}>
          <Pressable
            onPress={onOpenAuthor}
            disabled={!onOpenAuthor}
            accessibilityRole={onOpenAuthor ? 'button' : undefined}
            accessibilityLabel={onOpenAuthor ? 'Open your page' : undefined}
            style={styles.nameHit}
            hitSlop={6}
          >
            <Text style={styles.whoName} numberOfLines={1}>
              {name}
            </Text>
          </Pressable>
          <VerifiedMark />
          <View style={styles.headSpacer} />
          {/* Edit and Delete rather than a "···" menu, for the same reason the
              flag is a flag: two words are cheaper to read than a menu you have
              to open to find out what is in it. */}
          {!editing && (
            <Pressable
              onPress={() => {
                setDraft(update.text);
                setEditing(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Edit your post"
              hitSlop={10}
            >
              <Text style={styles.quietAction}>Edit</Text>
            </Pressable>
          )}
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel="Delete your post"
            hitSlop={10}
          >
            <Text style={styles.quietAction}>Delete</Text>
          </Pressable>
        </View>

        {/* Your own row carries its own buttons in the name row, so the username
            goes on the meta line rather than squeezing the name to "Dana …". */}
        <MonoLabel size={9} em={0.08} tone={color.faint} style={{ marginBottom: 8 }}>
          {[
            !onOwnPage && username && `@${username}`,
            !onOwnPage && line,
            `YOU · ${timeAgoLabel(update.at)}`,
            update.editedAt ? 'EDITED' : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </MonoLabel>

        {editing ? (
          <View>
            <TextInput
              value={draft}
              onChangeText={(t) => setDraft(t.slice(0, UPDATE_MAX_LENGTH))}
              style={styles.editInput}
              multiline
              autoFocus
              maxLength={UPDATE_MAX_LENGTH}
              accessibilityLabel="Rewrite your post"
            />
            <View style={styles.editActions}>
              <Pressable onPress={cancel} accessibilityRole="button" style={styles.editCancel}>
                <Text style={styles.editCancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={!draft.trim()}
                accessibilityRole="button"
                accessibilityLabel="Save your changes"
                style={[styles.editSave, !draft.trim() && { opacity: 0.4 }]}
              >
                <Text style={styles.editSaveLabel}>Save</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.text}>{update.text}</Text>
            {update.photo && (
              <Image source={{ uri: update.photo }} style={styles.photo} resizeMode="cover" />
            )}

            {/* What came back. Only comments are tappable — liking and
                reposting your own post is not a thing the app offers, but the
                counts are what "did anybody see it" is asking for. */}
            <View style={styles.actions}>
              <Tally icon="heart" label="Likes" count={likeCount} />
              <Pressable
                onPress={onComments}
                accessibilityRole="button"
                accessibilityLabel={
                  commentCount ? `Comments, ${commentCount}` : 'Comments, none yet'
                }
                hitSlop={8}
                style={styles.action}
              >
                <Icon name="comment" size={20} tone={color.label} />
                {commentCount > 0 && <Text style={styles.actionCount}>{commentCount}</Text>}
              </Pressable>
              <Tally icon="repost" label="Reposts" count={repostCount} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

/** A count nobody can tap, for the two reactions you cannot give yourself. */
function Tally({ icon, label, count }: { icon: 'heart' | 'repost'; label: string; count: number }) {
  return (
    <View
      style={styles.action}
      accessibilityLabel={`${label}, ${count}`}
      accessible
    >
      <Icon name={icon} size={icon === 'heart' ? 20 : 20} tone={color.faint} />
      {count > 0 && <Text style={styles.actionCount}>{count}</Text>}
    </View>
  );
}

export function FeedCard({
  update,
  liked,
  reposted,
  commentCount,
  saved,
  locked,
  onSave,
  onLike,
  onRepost,
  onComments,
  onReport,
  following,
  onFollow,
  onOpenAuthor,
  /**
   * True on the author's own page. Their name stops being a link — it would
   * reopen the page you are already on — and the per-post Follow goes away,
   * because the header above the list already carries one and three copies of
   * the same toggle on one screen is three chances to wonder which is live.
   */
  onOwnPage = false,
}: {
  update: FeedUpdate;
  liked: boolean;
  reposted: boolean;
  commentCount: number;
  saved: boolean;
  locked: boolean;
  onSave: () => void;
  onLike: () => void;
  onRepost: () => void;
  onComments: () => void;
  onReport: () => void;
  following: boolean;
  onFollow: () => void;
  onOpenAuthor?: (authorId: string) => void;
  onOwnPage?: boolean;
}) {
  // Carried on the post when it came from the server, looked up in the sample
  // directory when it did not. See lib/feedSource.ts.
  const author = authorOf(update);
  const openAuthor =
    onOwnPage || !onOpenAuthor ? undefined : () => onOpenAuthor(update.authorId);

  /**
   * Three actions and a save, in the order every other feed uses. Counts include
   * the teacher's own tap, so the number moves the moment they press it rather
   * than waiting for a server that does not exist.
   */
  const actions = [
    {
      ...POST_ACTIONS[0],
      count: (update.counts.like ?? 0) + (liked ? 1 : 0),
      on: liked,
      press: onLike,
    },
    { ...POST_ACTIONS[1], count: commentCount, on: false, press: onComments },
    {
      ...POST_ACTIONS[2],
      count: (update.counts.repost ?? 0) + (reposted ? 1 : 0),
      on: reposted,
      press: onRepost,
    },
  ];

  return (
    <View style={styles.row}>
      {/* The avatar is part of the same target as the name — it is the bigger
          of the two and the one people actually aim at. */}
      <Pressable
        onPress={openAuthor}
        disabled={!openAuthor}
        accessibilityRole={openAuthor ? 'button' : undefined}
        accessibilityLabel={openAuthor ? `Open @${author?.username}'s page` : undefined}
      >
        <Avatar
          name={author?.displayName ?? '?'}
          seed={author?.username ?? update.authorId}
          size={38}
        />
      </Pressable>

      <View style={styles.rowBody}>
        <View style={styles.nameRow}>
          <Pressable
            onPress={openAuthor}
            disabled={!openAuthor}
            accessibilityRole={openAuthor ? 'button' : undefined}
            accessibilityLabel={openAuthor ? `Open @${author?.username}'s page` : undefined}
            style={styles.nameHit}
            hitSlop={6}
          >
            <Text style={styles.whoName} numberOfLines={1}>
              {author?.displayName ?? 'Someone'}
            </Text>
          </Pressable>
          <VerifiedMark />
          <View style={styles.headSpacer} />
          {!onOwnPage && (
            <Pressable
              onPress={onFollow}
              accessibilityRole="button"
              accessibilityState={{ selected: following }}
              accessibilityLabel={
                following ? `Unfollow @${author?.username}` : `Follow @${author?.username}`
              }
              hitSlop={8}
            >
              <Text style={[styles.followLabel, following && styles.followLabelOn]}>
                {following ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
          )}
          {/* A flag rather than a "···" menu: the only thing behind it is
              reporting, and a dots menu makes people open it to find out. Always
              present, because a report button that has to be hunted for is one
              people give up on — and Apple requires one on any app carrying posts
              (guideline 1.2). */}
          <Pressable
            onPress={onReport}
            accessibilityRole="button"
            accessibilityLabel={`Report this post or block @${author?.username}`}
            hitSlop={12}
          >
            <Icon name="flag" size={17} tone={color.faint} />
          </Pressable>
        </View>

        {/* The username sits here rather than beside the name. In the name row it
            competed with Follow and the flag for about 250px and both the name
            and the handle ended up truncated to "Marisa Ok… @marisa.ok…"; down
            here it can wrap instead of being cut. Two people may both be "Ms P",
            so this is the part that is theirs alone. */}
        {/* Skipped on the author's own page, where the header two inches above
            says the same handle and the same byline for every row. */}
        {!onOwnPage && (
          <MonoLabel size={9} em={0.08} tone={color.faint} style={{ marginBottom: 2 }}>
            {[`@${author?.username}`, authorLine(author)].filter(Boolean).join(' · ')}
          </MonoLabel>
        )}
        <MonoLabel size={9} em={0.08} tone={color.faint} style={{ marginBottom: 9 }}>
          {[update.meta, update.editedAt ? 'EDITED' : ''].filter(Boolean).join(' · ')}
        </MonoLabel>

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
          {actions.map((a) => (
            <Pressable
              key={a.id}
              onPress={a.press}
              accessibilityRole="button"
              accessibilityState={a.id === 'comment' ? undefined : { selected: a.on }}
              accessibilityLabel={
                a.id === 'comment'
                  ? `Comments${a.count ? `, ${a.count}` : ', none yet'}`
                  : `${a.label}${a.on ? ', done' : ''}`
              }
              hitSlop={8}
              style={styles.action}
            >
              <Icon
                name={a.icon}
                size={20}
                tone={a.on ? color.accent : color.label}
                filled={a.on && a.id === 'like'}
              />
              {a.count > 0 && (
                <Text style={[styles.actionCount, a.on && styles.actionCountOn]}>{a.count}</Text>
              )}
            </Pressable>
          ))}

          <View style={styles.headSpacer} />

          {/* The reason the feed exists: you can take the thing, not just read
              it. A bookmark is the Threads shape for save, but the word stays —
              "save this onto my own list" is the app's whole argument and an
              unlabelled icon does not make it. */}
          <Pressable
            onPress={onSave}
            disabled={saved}
            accessibilityRole="button"
            accessibilityLabel={
              saved
                ? 'Already on your list'
                : locked
                  ? 'Your list is full. Here+ for an unlimited list'
                  : `Save "${update.text}" to your list`
            }
            hitSlop={8}
            style={styles.action}
          >
            <Icon name="bookmark" size={19} tone={saved ? color.faint : color.accent} filled={saved} />
            <Text style={[styles.saveLabel, saved && styles.saveLabelDone]}>
              {saved ? 'On your list' : locked ? 'List full · Here+' : 'Save'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/**
 * One mark, because there is now one check. Everyone in the feed reached a code
 * at a school address; the tick says exactly that and nothing more.
 */
export function VerifiedMark() {
  return (
    <View style={styles.verified}>
      <Text style={styles.verifiedTick} accessibilityLabel="Verified with a school email">
        ✓
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 11,
    paddingTop: 16,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  rowBody: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 3,
  },
  nameHit: {
    flexShrink: 1,
  },
  verified: {
    width: 14,
    height: 14,
    borderRadius: 99,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedTick: {
    fontSize: 8.5,
    lineHeight: 11,
    fontWeight: '700',
    color: '#fff',
  },
  whoName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: color.ink,
    flexShrink: 1,
  },
  followLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: color.accent,
  },
  followLabelOn: {
    fontWeight: '400',
    color: color.faint,
  },
  headSpacer: {
    flex: 1,
  },
  quietAction: {
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
  editInput: {
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.accentBorderSoft,
    backgroundColor: color.ground,
    fontSize: 15,
    lineHeight: 22,
    color: color.ink,
    outlineColor: color.accent,
    outlineWidth: 2,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  editCancel: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    justifyContent: 'center',
  },
  editCancelLabel: {
    fontSize: 13.5,
    color: color.body,
  },
  editSave: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    justifyContent: 'center',
  },
  editSaveLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 14,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 12.5,
    color: color.label,
  },
  actionCountOn: {
    color: color.accent,
  },
  saveLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: color.accent,
  },
  saveLabelDone: {
    fontWeight: '400',
    color: color.faint,
  },
});
