/**
 * Everything the app hands off to: Tended Collective's writing and podcast, the
 * free-therapy shelf, and the sponsor inventory.
 *
 * It is its own tab because the plan that used to sit above it moved to the
 * profile. What is left is all outbound, and none of it is the daily loop.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PodcastSection } from '../components/PodcastSection';
import { StripedPlaceholder } from '../components/StripedPlaceholder';
import { Body, Card, Display, MonoLabel } from '../components/ui';
import {
  AD_SLOTS,
  POSTS,
  postUrl,
  RESOURCE_LINK,
  SHOW_UNSOLD_SLOTS,
  SITE,
  Sponsor,
  SPONSORS,
} from '../data/mock';
import { openLink } from '../lib/links';
import { color, radius } from '../theme';

export function ResourcesScreen() {
  return (
    <View>
      <MonoLabel>RESOURCES</MonoLabel>
      <Display size={32} style={{ marginTop: 10 }}>
        Reading, listening, help
      </Display>

      <View style={styles.sectionHead}>
        <MonoLabel>ARTICLES</MonoLabel>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="All posts on tendedcollective.com"
          onPress={() => openLink(SITE.blog)}
          hitSlop={8}
        >
          <Text style={styles.link}>All posts</Text>
        </Pressable>
      </View>

      <View style={styles.posts}>
        {POSTS.map((post) => (
          <Pressable
            key={post.id}
            accessibilityRole="link"
            accessibilityLabel={`${post.title}, opens tendedcollective.com`}
            onPress={() => openLink(postUrl(post.slug))}
          >
            <Card style={styles.postCard}>
              <StripedPlaceholder />
              <View style={styles.postCopy}>
                <MonoLabel size={9.5} em={0.1} tone={color.faint}>
                  {post.kicker}
                </MonoLabel>
                <Display size={19} lineHeight={1.2} weight="regular" style={{ marginTop: 6 }}>
                  {post.title}
                </Display>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>

      {/* Tended Collective's other feed. Editorial, not a placement. */}
      <PodcastSection />

      <MonoLabel style={{ marginTop: 26 }}>THERAPY AND SUPPORT</MonoLabel>

      {/* Tended Collective's own shelf holds the first slot and is never sold,
          so the section opens on something editorial rather than bought. */}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={RESOURCE_LINK.title}
        onPress={() => openLink(RESOURCE_LINK.href)}
      >
        <Card style={styles.resourceCard}>
          <View style={styles.helpCopy}>
            <Text style={styles.helpTitle}>{RESOURCE_LINK.title}</Text>
            <Text style={styles.helpSub}>{RESOURCE_LINK.sub}</Text>
          </View>
          <Text style={styles.helpArrow}>→</Text>
        </Card>
      </Pressable>

      {Array.from({ length: AD_SLOTS }, (_, i) => {
        const sponsor = SPONSORS[i];
        if (sponsor) return <SponsorCard key={sponsor.id} sponsor={sponsor} />;
        return SHOW_UNSOLD_SLOTS ? <EmptySlot key={`slot-${i}`} /> : null;
      })}

      <Body size={12} lineHeight={1.6} tone={color.label} style={{ marginTop: 12 }}>
        Sponsored placements are labelled. Sponsors fund the free plan and never receive your data.
        Opening one is not logged or shared.
      </Body>
    </View>
  );
}

/**
 * A sold placement. The SPONSORED label and the advertiser's name are part of
 * the card rather than a footnote — a paid recommendation in a mental-health
 * app has to be legible as one at a glance.
 */
function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Sponsored: ${sponsor.advertiser}, ${sponsor.title}`}
      onPress={() => openLink(sponsor.href)}
    >
      <Card style={styles.sponsorCard}>
        <View style={styles.sponsorHead}>
          <View style={styles.sponsoredTag}>
            <MonoLabel size={8.5} em={0.12} tone={color.muted}>
              SPONSORED
            </MonoLabel>
          </View>
          <MonoLabel size={9} em={0.1} tone={color.faint}>
            {sponsor.advertiser.toUpperCase()}
          </MonoLabel>
        </View>
        <View style={styles.sponsorBody}>
          <View style={styles.helpCopy}>
            <Text style={styles.helpTitle}>{sponsor.title}</Text>
            <Text style={styles.helpSub}>{sponsor.sub}</Text>
          </View>
          <Text style={styles.helpArrow}>→</Text>
        </View>
      </Card>
    </Pressable>
  );
}

/** Inventory nobody has bought yet. Hidden in a shipping build. */
function EmptySlot() {
  return (
    <View style={styles.emptySlot}>
      <MonoLabel size={9} em={0.12} tone={color.fainter}>
        AD SLOT · AVAILABLE
      </MonoLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 26,
  },
  link: {
    fontSize: 13,
    color: color.accent,
  },
  posts: {
    gap: 10,
    marginTop: 12,
  },
  postCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  postCopy: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  resourceCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    // The one editorial row in this section, so it carries the accent rather
    // than the hairline the bought cards use.
    borderColor: color.accentBorder,
    borderWidth: 1.5,
  },
  sponsorCard: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  sponsorHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sponsoredTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: color.track,
  },
  sponsorBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptySlot: {
    marginTop: 10,
    height: 64,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpCopy: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: color.ink,
  },
  helpSub: {
    fontSize: 12,
    color: color.label,
    marginTop: 1,
  },
  helpArrow: {
    fontSize: 16,
    color: color.accent,
  },
});
