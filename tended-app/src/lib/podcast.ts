/**
 * The show's real episodes, from Apple's public lookup API.
 *
 * `https://itunes.apple.com/lookup?id=<showId>&entity=podcastEpisode` returns
 * the show as the first result and its episodes after it. No key, no account,
 * and — unlike the RSS feed, which is served without CORS headers by most
 * podcast hosts — it can be called straight from the client, so the app needs
 * no server of its own to list episodes.
 *
 * Two places it will not load, both expected:
 *
 *   - the published web preview, where the artifact CSP blocks every external
 *     request by design, and
 *   - anywhere offline.
 *
 * Both surface the same way: `fetchEpisodes` resolves to null and the section
 * falls back to a single button through to the show. It never throws at the
 * caller, because a reading list is not worth breaking a screen over.
 */

export type Episode = {
  id: string;
  title: string;
  /** Already formatted for the kicker line, e.g. "12 MAR · 34 MIN". */
  kicker: string;
  url: string;
};

type LookupResult = {
  wrapperType?: string;
  kind?: string;
  trackId?: number;
  trackName?: string;
  releaseDate?: string;
  trackTimeMillis?: number;
  trackViewUrl?: string;
  episodeUrl?: string;
  collectionViewUrl?: string;
};

function kickerFor(released?: string, millis?: number): string {
  const parts: string[] = [];
  if (released) {
    const d = new Date(released);
    if (!Number.isNaN(d.getTime())) {
      parts.push(
        d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase(),
      );
    }
  }
  if (millis && millis > 0) parts.push(`${Math.round(millis / 60000)} MIN`);
  return parts.join(' · ');
}

export async function fetchEpisodes(showId: string, limit: number): Promise<Episode[] | null> {
  const url =
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(showId)}` +
    `&media=podcast&entity=podcastEpisode&limit=${limit + 1}&sort=recent`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const payload = (await response.json()) as { results?: LookupResult[] };

    const episodes = (payload.results ?? [])
      .filter((r) => r.wrapperType === 'podcastEpisode' || r.kind === 'podcast-episode')
      .slice(0, limit)
      .map<Episode | null>((r) => {
        const link = r.trackViewUrl ?? r.collectionViewUrl ?? r.episodeUrl;
        if (!r.trackName || !link) return null;
        return {
          id: String(r.trackId ?? r.trackName),
          title: r.trackName,
          kicker: kickerFor(r.releaseDate, r.trackTimeMillis),
          url: link,
        };
      })
      .filter((e): e is Episode => e !== null);

    return episodes.length ? episodes : null;
  } catch {
    // Offline, blocked by a content policy, or the shape changed underneath us.
    return null;
  }
}
