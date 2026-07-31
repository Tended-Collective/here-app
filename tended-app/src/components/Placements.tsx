/**
 * The ad inventory, and the one editorial card that sits in the same rack.
 *
 * These used to live on a Resources tab. They are now dealt into the feed
 * itself, which is where the attention is — a placement on a tab nobody opens
 * is not inventory you can sell. The cadence is fixed and declared here rather
 * than negotiated per screen, so what an advertiser is buying is a known slot
 * rather than "somewhere in the app".
 *
 * Two rules hold regardless of where the cards render. Every paid placement
 * carries a SPONSORED label and the advertiser's own name — a bought
 * recommendation inside a mental-health app has to be legible as one at a
 * glance, and the FTC requires the disclosure to be clear and conspicuous. And
 * the first placement is never for sale: Tended Collective's own free-therapy
 * shelf holds it, so the rack opens on something editorial.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AD_SLOTS, RESOURCE_LINK, SHOW_UNSOLD_SLOTS, Sponsor, SPONSORS } from '../data/mock';
import { openLink } from '../lib/links';
import { color, radius } from '../theme';
import { Card, MonoLabel } from './ui';

/**
 * How many posts run before the first placement, and how many between the ones
 * after it. Two up front so the feed reads as a feed before it reads as a page
 * with ads on it.
 *
 * EVERY is tight because the sample feed is only a handful of posts long and
 * the rack would otherwise never be seen. Against a real backend, where the
 * feed runs to dozens of posts, this wants to be 5 or 6 — one number, here.
 */
const FIRST_AFTER = 2;
const EVERY = 2;

type Placement =
  | { kind: 'resource' }
  | { kind: 'sponsor'; sponsor: Sponsor }
  | { kind: 'empty'; id: string };

/** The rack, in order: the editorial card, then each slot in turn. */
function rack(): Placement[] {
  const out: Placement[] = [{ kind: 'resource' }];
  for (let i = 0; i < AD_SLOTS; i++) {
    const sponsor = SPONSORS[i];
    if (sponsor) out.push({ kind: 'sponsor', sponsor });
    else if (SHOW_UNSOLD_SLOTS) out.push({ kind: 'empty', id: `slot-${i}` });
  }
  return out;
}

/**
 * Deals placements into a list of posts. Returns one entry per rendered row so
 * the feed can map straight over it.
 */
export function withPlacements<T>(posts: T[]): ({ post: T } | { placement: Placement })[] {
  const slots = rack();
  const out: ({ post: T } | { placement: Placement })[] = [];
  let next = 0;

  posts.forEach((post, i) => {
    out.push({ post });
    const shown = i + 1;
    const due = shown === FIRST_AFTER || (shown > FIRST_AFTER && (shown - FIRST_AFTER) % EVERY === 0);
    if (due && next < slots.length) out.push({ placement: slots[next++] });
  });

  // Any slot the feed ran out of posts before reaching goes at the foot, so
  // unsold inventory is visible while the space is being sold rather than
  // hidden behind a feed that happens to be short today. Sold placements are
  // not flushed this way — an advertiser bought a position in the feed, not a
  // footer.
  while (next < slots.length) {
    const slot = slots[next++];
    if (slot.kind === 'empty') out.push({ placement: slot });
  }

  return out;
}

export function PlacementCard({ placement }: { placement: Placement }) {
  if (placement.kind === 'resource') return <ResourceCard />;
  if (placement.kind === 'sponsor') return <SponsorCard sponsor={placement.sponsor} />;
  return <EmptySlot />;
}

/** Tended Collective's own shelf. Never sold, always the first placement. */
export function ResourceCard() {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={RESOURCE_LINK.title}
      onPress={() => openLink(RESOURCE_LINK.href)}
    >
      <Card style={styles.resourceCard}>
        <View style={styles.copy}>
          <Text style={styles.title}>{RESOURCE_LINK.title}</Text>
          <Text style={styles.sub}>{RESOURCE_LINK.sub}</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </Card>
    </Pressable>
  );
}

export function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
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
          <View style={styles.copy}>
            <Text style={styles.title}>{sponsor.title}</Text>
            <Text style={styles.sub}>{sponsor.sub}</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </View>
      </Card>
    </Pressable>
  );
}

/** Inventory nobody has bought yet. Hidden in a shipping build. */
export function EmptySlot() {
  return (
    <View style={styles.emptySlot}>
      <MonoLabel size={9} em={0.12} tone={color.fainter}>
        AD SLOT · AVAILABLE
      </MonoLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  resourceCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    // The one editorial card in the rack, so it carries the accent rather than
    // the hairline the bought cards use.
    borderColor: color.accentBorder,
    borderWidth: 1.5,
  },
  sponsorCard: {
    marginTop: 12,
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
    marginTop: 12,
    height: 64,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 14.5,
    fontWeight: '600',
    color: color.ink,
  },
  sub: {
    fontSize: 12,
    color: color.label,
    marginTop: 1,
  },
  arrow: {
    fontSize: 16,
    color: color.accent,
  },
});
