/**
 * "Something changed on the server — reload."
 *
 * A counter and a set of listeners, and nothing more. It exists because of a
 * direction problem: the store performs the writes, the `useFeedPosts` hook owns
 * the loaded posts, and the store cannot call into a hook. Rather than hoisting
 * the whole feed into the store — where it does not belong, because a feed is a
 * query over somebody else's writing and the store is this device — the store
 * says *that* something changed and whoever is showing a feed reloads.
 *
 * Deliberately not a message about *what* changed. A targeted update would mean
 * patching a locally-held copy of a row, which is how a client's idea of a post
 * drifts from the database's. Refetching is a few hundred bytes and it is always
 * right.
 */

import { useEffect, useState } from 'react';

let version = 0;
const listeners = new Set<(v: number) => void>();

/** Call after any write the server now knows about. */
export function bumpFeed(): void {
  version += 1;
  for (const listen of listeners) listen(version);
}

/** Re-renders the caller whenever `bumpFeed` runs. */
export function useFeedVersion(): number {
  const [v, setV] = useState(version);
  useEffect(() => {
    listeners.add(setV);
    // Between mounting and subscribing, a write may already have landed.
    setV(version);
    return () => {
      listeners.delete(setV);
    };
  }, []);
  return v;
}
