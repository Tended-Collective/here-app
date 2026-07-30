import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PodcastSection } from '../components/PodcastSection';
import { useSheets } from '../components/Sheet';
import { StripedPlaceholder } from '../components/StripedPlaceholder';
import { Body, Card, Display, Divider, MonoLabel } from '../components/ui';
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
import { WEEKDAY_INITIALS, weekDates, weekdayIndex, weekOf } from '../lib/dates';
import { openLink } from '../lib/links';
import { useStore } from '../store';
import { color, radius } from '../theme';

const DAY_COL = 26;

export function SupportScreen() {
  const { practices, practiceDays, togglePracticeDay, boundaries, contacts, toggleBoundary } =
    useStore();
  const { open } = useSheets();
  const week = useMemo(() => weekDates(), []);
  const today = weekdayIndex();

  const kept = practices.map(
    (p) => week.filter((d, i) => i <= today && (practiceDays[p.id] ?? []).includes(d)).length,
  );
  const total = kept.reduce((a, b) => a + b, 0);
  const weakest = practices[kept.indexOf(Math.min(...kept))];

  /**
   * The best any earlier week managed, or null if this is the first week on
   * record. Read off the stored dates rather than asserted — the note used to
   * claim "your best run since August" on any week that cleared five, which the
   * app had no way of knowing.
   */
  const priorBest = useMemo(() => {
    const thisWeek = weekOf(week[0]);
    const totals = new Map<string, number>();
    Object.values(practiceDays)
      .flat()
      .forEach((date) => {
        const key = weekOf(date);
        if (key === thisWeek) return;
        totals.set(key, (totals.get(key) ?? 0) + 1);
      });
    return totals.size ? Math.max(...totals.values()) : null;
  }, [practiceDays, week]);

  const note =
    practices.length === 0
      ? 'No habits yet. Build your plan to start tracking.'
      : total === 0
        ? 'Nothing logged yet this week.'
        : priorBest !== null && total > priorBest
          ? `${total} kept this week — your best week yet.`
          : `${total} kept this week. ${weakest.label} is the one you miss most.`;

  return (
    <View>
      <MonoLabel>SUPPORT</MonoLabel>
      <Display style={{ marginTop: 10 }}>Habits and resources</Display>

      <Card style={styles.practiceCard}>
        <View style={styles.practiceHead}>
          <Text style={styles.cardTitle}>Your self-care plan</Text>
          <MonoLabel em={0}>THIS WEEK</MonoLabel>
        </View>

        {boundaries.length > 0 && (
          <View style={styles.planSection}>
            <MonoLabel size={9.5} em={0.1} tone={color.faint}>
              BOUNDARIES
            </MonoLabel>
            {boundaries.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => toggleBoundary(b.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: b.active }}
                accessibilityLabel={b.label}
                style={styles.boundaryRow}
              >
                <View style={[styles.box, b.active && styles.boxOn]}>
                  {b.active && <Text style={styles.check}>✓</Text>}
                </View>
                <Text style={[styles.boundaryLabel, !b.active && styles.boundaryOff]}>
                  {b.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {practices.length > 0 && (
          <MonoLabel size={9.5} em={0.1} tone={color.faint} style={{ marginTop: 18 }}>
            DAILY HABITS
          </MonoLabel>
        )}

        <View style={styles.dayHeader}>
          <View style={styles.spacer} />
          {WEEKDAY_INITIALS.map((d, i) => (
            <MonoLabel key={i} size={9.5} em={0} tone={color.faint} style={styles.dayHeaderCell}>
              {d}
            </MonoLabel>
          ))}
        </View>

        <View style={styles.practiceRows}>
          {practices.map((p) => {
            const done = practiceDays[p.id] ?? [];
            return (
              <View key={p.id} style={styles.practiceRow}>
                <Text style={styles.practiceLabel}>{p.label}</Text>
                {week.map((date, di) => {
                  const on = done.includes(date);
                  return (
                    <Pressable
                      key={date}
                      onPress={() => togglePracticeDay(p.id, date)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${p.label}, ${WEEKDAY_INITIALS[di]}`}
                      style={[
                        styles.tick,
                        {
                          backgroundColor: on ? p.fill : 'transparent',
                          borderColor: on
                            ? p.border
                            : di === today
                              ? 'rgba(0,0,0,0.28)'
                              : color.outline,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            );
          })}
        </View>

        <Divider style={styles.practiceDivider} />
        <Body>{note}</Body>

        {contacts.length > 0 && (
          <View style={styles.planSection}>
            <MonoLabel size={9.5} em={0.1} tone={color.faint}>
              SUPPORT CONTACTS
            </MonoLabel>
            {contacts.map((c) =>
              c.phone ? (
                <Pressable
                  key={c.id}
                  onPress={() => openLink(`tel:${c.phone.replace(/[^0-9+]/g, '')}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${c.name}`}
                  style={styles.contactRow}
                >
                  <Text style={styles.contactName}>{c.name}</Text>
                  <Text style={styles.contactAction}>Call</Text>
                </Pressable>
              ) : (
                <View key={c.id} style={styles.contactRow}>
                  <Text style={styles.contactName}>{c.name}</Text>
                </View>
              ),
            )}
          </View>
        )}

        <View style={styles.practiceActions}>
          <Pressable
            accessibilityRole="button"
            style={styles.ghostButton}
            onPress={() => open('plan')}
          >
            <Text style={styles.ghostLabel}>
              {boundaries.length || contacts.length ? 'Edit plan' : 'Build your plan'}
            </Text>
          </Pressable>
        </View>
      </Card>


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

      <MonoLabel style={{ marginTop: 26 }}>RESOURCES</MonoLabel>

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
  planSection: {
    marginTop: 18,
    gap: 2,
  },
  boundaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: color.outlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  check: {
    fontSize: 12,
    lineHeight: 14,
    color: '#fff',
    fontWeight: '700',
  },
  boundaryLabel: {
    flex: 1,
    fontSize: 14.5,
    color: color.ink,
  },
  boundaryOff: {
    color: color.faint,
    textDecorationLine: 'line-through',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  contactName: {
    fontSize: 15,
    color: color.ink,
  },
  contactAction: {
    fontSize: 13.5,
    fontWeight: '600',
    color: color.accent,
  },
  practiceCard: {
    marginTop: 22,
    padding: 18,
  },
  practiceHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  cardTitle: {
    fontSize: 16.5,
    fontWeight: '600',
    color: color.ink,
  },
  dayHeader: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  spacer: {
    flex: 1,
  },
  dayHeaderCell: {
    width: DAY_COL,
    textAlign: 'center',
  },
  practiceRows: {
    gap: 2,
    marginTop: 6,
  },
  practiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  practiceLabel: {
    flex: 1,
    fontSize: 14.5,
    color: color.ink,
  },
  tick: {
    width: DAY_COL,
    height: DAY_COL,
    borderRadius: 99,
    borderWidth: 1,
  },
  practiceDivider: {
    marginTop: 14,
    marginBottom: 12,
  },
  practiceActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  ghostButton: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outlineStrong,
    justifyContent: 'center',
  },
  ghostLabel: {
    fontSize: 14,
    color: color.ink,
  },
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
  helpCard: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  helpDivider: {
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
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
