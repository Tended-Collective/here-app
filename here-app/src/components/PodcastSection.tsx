/**
 * The podcast, alongside the reading list and headed the same way.
 *
 * With a show ID set it lists the show's real episodes from Apple's lookup API;
 * without one — or anywhere the request cannot be made, including the published
 * web preview, whose CSP blocks every external call — it falls back to a single
 * button through to the show. The fallback is the same shape either way, so the
 * section never looks broken, only shorter.
 */

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PODCAST_EPISODES, PODCAST_SHOW_ID, podcastUrl } from '../data/mock';
import { openLink } from '../lib/links';
import { Episode, fetchEpisodes } from '../lib/podcast';
import { color } from '../theme';
import { Card, Display, MonoLabel } from './ui';

export function PodcastSection() {
  const [episodes, setEpisodes] = useState<Episode[] | null>(null);
  const showUrl = podcastUrl();

  useEffect(() => {
    if (!PODCAST_SHOW_ID) return;
    let cancelled = false;
    fetchEpisodes(PODCAST_SHOW_ID, PODCAST_EPISODES).then((result) => {
      if (!cancelled) setEpisodes(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <View style={styles.sectionHead}>
        <MonoLabel>PODCAST</MonoLabel>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="All episodes on Apple Podcasts"
          onPress={() => openLink(showUrl)}
          hitSlop={8}
        >
          <Text style={styles.link}>All episodes</Text>
        </Pressable>
      </View>

      {episodes ? (
        <View style={styles.episodes}>
          {episodes.map((episode) => (
            <Pressable
              key={episode.id}
              accessibilityRole="link"
              accessibilityLabel={`${episode.title}, opens Apple Podcasts`}
              onPress={() => openLink(episode.url)}
            >
              <Card style={styles.episodeCard}>
                <MonoLabel size={9.5} em={0.1} tone={color.faint}>
                  {episode.kicker || 'EPISODE'}
                </MonoLabel>
                <Display size={19} lineHeight={1.2} weight="regular" style={{ marginTop: 6 }}>
                  {episode.title}
                </Display>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Tended Collective, the podcast, on Apple Podcasts"
          onPress={() => openLink(showUrl)}
        >
          <Card style={styles.showCard}>
            <View style={styles.showCopy}>
              <Text style={styles.showTitle}>Latest episode</Text>
              <Text style={styles.showSub}>Open the show in Apple Podcasts</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </Card>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 26,
  },
  link: {
    fontSize: 13.5,
    color: color.accent,
  },
  episodes: {
    marginTop: 12,
    gap: 10,
  },
  episodeCard: {
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  showCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  showCopy: {
    flex: 1,
  },
  showTitle: {
    fontSize: 15.5,
    fontWeight: '600',
    color: color.ink,
  },
  showSub: {
    fontSize: 13,
    color: color.muted,
    marginTop: 3,
  },
  arrow: {
    fontSize: 15,
    color: color.faint,
  },
});
