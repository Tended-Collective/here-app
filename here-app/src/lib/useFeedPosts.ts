/**
 * The posts a screen should draw, from wherever they live.
 *
 * A hook rather than more state in the store, because a feed is a *query* — it
 * depends on which scope tab is selected and whose page you are on, both of
 * which are screen state — while the store is the teacher's own device. Putting
 * a scope-dependent, refetching list in there would mean the store had to know
 * which screen was mounted.
 *
 * What the caller gets is the same shape in both worlds: `posts` as
 * `FeedUpdate[]`, plus the loading and error states that only exist when there
 * is a server. Offline those are permanently false and null, so a screen written
 * against them costs nothing.
 *
 * ─── Reactions, and where the truth lives ────────────────────────────────────
 *
 * Offline, `likes` and `reposts` are arrays in the store: the only record there
 * could be. Online the server holds them, and it returns yours with the feed —
 * so `liked`/`reposted` here override the store's copy rather than being merged
 * with it. Merging would resurrect a like that had been undone on another phone.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeedUpdate } from '../data/mock';
import { BACKEND_CONFIGURED } from './backend';
import { FeedLoad, FeedScope, loadRemoteFeed, loadRemotePostsBy, localFeed } from './feedSource';
import { useFeedVersion } from './feedSignal';

export type FeedQuery =
  /** The main feed, filtered by the scope tabs. */
  | { kind: 'feed'; scope: FeedScope; zip: string; expanded: boolean }
  /** One person's page. */
  | { kind: 'person'; authorId: string };

export type FeedState = {
  posts: FeedUpdate[];
  /** True only while a real request is in flight. Never true offline. */
  loading: boolean;
  /** A sentence to show, or null. Never set offline. */
  error: string | null;
  /** Server truth about your own reactions, or null when there is no server. */
  liked: string[] | null;
  reposted: string[] | null;
  commentCounts: Record<string, number> | null;
  /** Re-fetch. Wired to pull-to-refresh, and called after a write. */
  reload: () => void;
};

export function useFeedPosts(query: FeedQuery): FeedState {
  const [remote, setRemote] = useState<FeedLoad | null>(null);
  const [loading, setLoading] = useState(BACKEND_CONFIGURED);
  const [error, setError] = useState<string | null>(null);
  /** Bumped to force a refetch without changing the query. */
  const [nonce, setNonce] = useState(0);
  /**
   * Bumped by the store after any write that reached the server, so a post, a
   * like or a block shows up here without the screen wiring itself to each one.
   */
  const version = useFeedVersion();

  // The query is an object literal at the call site, so a new one arrives every
  // render. Depending on it directly would refetch forever; this is its identity.
  const key = JSON.stringify(query);

  useEffect(() => {
    if (!BACKEND_CONFIGURED) return;
    let live = true;
    setLoading(true);

    (async () => {
      const parsed: FeedQuery = JSON.parse(key);
      const result =
        parsed.kind === 'person'
          ? await loadRemotePostsBy(parsed.authorId)
          : await loadRemoteFeed(parsed.scope, parsed.zip);

      // The screen moved on — a scope tab was tapped, or the page was left —
      // while this was in the air. Writing now would replace what the newer
      // request is about to deliver, or resurrect a page nobody is looking at.
      if (!live) return;

      setLoading(false);
      if (result === null) return; // No backend after all; nothing to say.
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setError(null);
      setRemote(result);
    })();

    return () => {
      live = false;
    };
  }, [key, nonce, version]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const local = useMemo(() => {
    if (BACKEND_CONFIGURED) return [];
    // A person's page draws from the sample directory by filtering the whole
    // fixture set; the feed draws the recent slice, or all of it once "See
    // earlier today" has been pressed.
    const all = localFeed(true);
    if (query.kind === 'person') return all.filter((p) => p.authorId === query.authorId);
    return localFeed(query.expanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    posts: BACKEND_CONFIGURED ? (remote?.posts ?? []) : local,
    loading,
    error,
    liked: remote?.liked ?? null,
    reposted: remote?.reposted ?? null,
    commentCounts: remote?.commentCounts ?? null,
    reload,
  };
}
