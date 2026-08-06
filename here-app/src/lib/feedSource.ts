/**
 * Where the feed's posts come from — sample data, or the server.
 *
 * The screens do not choose. They read `feed` off the store and render it, and
 * this module decides what that array holds: the fixtures in data/mock.ts when
 * the build has no backend, and Supabase rows when it has one. Both arrive as
 * `FeedUpdate`, so `PostCard` never learns which world it is drawing.
 *
 * Keeping the adapter here rather than in the store is deliberate. The store is
 * about the teacher's own device; this is about somebody else's writing, and the
 * translation between a database row and a rendered post is the thing most
 * likely to need changing when the schema does.
 */

import { AUTHORS, FeedAuthor, FeedUpdate, LAST_HOUR_UPDATES, NEARBY_UPDATES } from '../data/mock';
import { getFeed, getPostsBy, Post, Profile } from './api';
import { timeAgoLabel } from './dates';

/**
 * A profile as the feed renders it.
 *
 * The `show_*` flags are applied here, once, on the way in. The server stores
 * both the value and whether it may be shown — someone can hide their state
 * without losing the ZIP that "near my school" is matched on — so the rendering
 * side must never see a field the teacher chose to keep off their byline. Doing
 * it at the boundary means no component can forget.
 */
function toAuthor(p: Profile): FeedAuthor {
  return {
    id: p.id,
    displayName: p.displayName,
    username: p.username,
    job: p.showJob ? p.job : undefined,
    level: p.showLevel ? p.level : undefined,
    state: p.showState ? p.state : undefined,
    // Never rendered, and never sent to a renderer. The server does the "near my
    // school" matching; the app has no reason to hold another teacher's ZIP.
    zip: undefined,
    years: p.showYears && p.years !== null ? p.years : undefined,
  };
}

/**
 * The tint on a post. Purely decorative, and it has to be stable: derived from
 * the post id so a row keeps its colour across a refresh rather than flickering
 * to a new one every time the feed reloads.
 */
const DOTS = [
  'rgba(117,174,129,0.65)',
  'rgba(120,180,152,0.65)',
  'rgba(112,180,168,0.65)',
  'rgba(108,178,184,0.6)',
  'rgba(112,175,197,0.6)',
];

function dotFor(id: string): string {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum = (sum + id.charCodeAt(i)) % 4093;
  return DOTS[sum % DOTS.length];
}

/** One Supabase row, as the feed renders it. */
function toUpdate(p: Post): FeedUpdate {
  return {
    id: p.id,
    authorId: p.author.id,
    author: toAuthor(p.author),
    text: p.text,
    // Recomputed on every render pass rather than stored, so a post that said
    // "2 MIN AGO" when it loaded does not still say it an hour later.
    meta: timeAgoLabel(p.createdAt),
    dot: dotFor(p.id),
    photo: p.photo ?? undefined,
    counts: { like: p.likeCount, repost: p.repostCount },
    mine: p.mine,
    editedAt: p.editedAt ?? undefined,
  };
}

export type FeedScope = 'everywhere' | 'nearby' | 'following';

export type FeedLoad = {
  posts: FeedUpdate[];
  /** Which of these the signed-in teacher has liked, by id. Server truth. */
  liked: string[];
  reposted: string[];
  /** Per-post comment counts, so the icon can carry a number without N queries. */
  commentCounts: Record<string, number>;
};

/**
 * The whole feed, from the server.
 *
 * Returns null when there is no backend — not an empty array, which the caller
 * would render as "nobody has posted" and which is a very different claim from
 * "this build has no server".
 */
export async function loadRemoteFeed(
  scope: FeedScope,
  zip: string,
): Promise<FeedLoad | { error: string } | null> {
  const result = await getFeed({ scope, zip });
  if (!result.ok) return result.offline ? null : { error: result.error };
  return summarize(result.data);
}

/** One person's posts, from the server. Same null-versus-empty rule. */
export async function loadRemotePostsBy(
  authorId: string,
): Promise<FeedLoad | { error: string } | null> {
  const result = await getPostsBy(authorId);
  if (!result.ok) return result.offline ? null : { error: result.error };
  return summarize(result.data);
}

function summarize(posts: Post[]): FeedLoad {
  const commentCounts: Record<string, number> = {};
  for (const p of posts) commentCounts[p.id] = p.commentCount;
  return {
    posts: posts.map(toUpdate),
    liked: posts.filter((p) => p.liked).map((p) => p.id),
    reposted: posts.filter((p) => p.reposted).map((p) => p.id),
    commentCounts,
  };
}

/**
 * The sample feed, unchanged from what shipped.
 *
 * `expanded` is the "See earlier today" state: the four recent posts, or those
 * plus the three older ones. It stays a local concern because the fixtures are
 * a fixed list — against a server the same button becomes a second page.
 */
export function localFeed(expanded: boolean): FeedUpdate[] {
  return expanded ? [...NEARBY_UPDATES, ...LAST_HOUR_UPDATES] : NEARBY_UPDATES;
}

/** Whoever wrote it: carried on the post when remote, looked up when not. */
export function authorOf(post: FeedUpdate): FeedAuthor | undefined {
  return post.author ?? AUTHORS[post.authorId];
}
