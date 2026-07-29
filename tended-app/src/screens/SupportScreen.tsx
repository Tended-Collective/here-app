import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSheets } from '../components/Sheet';
import { StripedPlaceholder } from '../components/StripedPlaceholder';
import { Body, Card, Display, Divider, MonoLabel } from '../components/ui';
import {
  AD_SLOTS,
  CRISIS_LINES,
  POSTS,
  RESOURCE_LINK,
  SHOW_UNSOLD_SLOTS,
  SITE,
  Sponsor,
  SPONSORS,
} from '../data/mock';
import { WEEKDAY_INITIALS, weekDates, weekdayIndex } from '../lib/dates';
import { openLink } from '../lib/links';
import { useStore } from '../store';
import { color, radius } from '../theme';

const DAY_COL = 26;

export function SupportScreen() {
  const { practices, practiceDays, togglePracticeDay } = useStore();
  const { open } = useSheets();
  const week = useMemo(() => weekDates(), []);
  const today = weekdayIndex();

  const kept = practices.map(
    (p) => week.filter((d, i) => i <= today && (practiceDays[p.id] ?? []).includes(d)).length,
  );
  const total = kept.reduce((a, b) => a + b, 0);
  const weakest = practices[kept.indexOf(Math.min(...kept))];

  const note =
    practices.length === 0
      ? 'No practices yet. Add one below to start tracking.'
      : total === 0
        ? 'Nothing marked yet this week. One is enough to start.'
        : total < 5
          ? `${total} kept this week. ${weakest.label} is the one you miss most.`
          : `${total} kept this week — your best run since August.`;

  return (
    <View>
      <MonoLabel>SUPPORT</MonoLabel>
      <Display style={{ marginTop: 10 }}>Looking after yourself</Display>

      <Card style={styles.practiceCard}>
        <View style={styles.practiceHead}>
          <Text style={styles.cardTitle}>Your practices</Text>
          <MonoLabel em={0}>THIS WEEK</MonoLabel>
        </View>

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

        <View style={styles.practiceActions}>
          <Pressable
            accessibilityRole="button"
            style={styles.ghostButton}
            onPress={() => open('practices')}
          >
            <Text style={styles.ghostLabel}>Edit my practices</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={styles.ghostButton}
            onPress={() => open('practices')}
          >
            <Text style={styles.ghostLabel}>Add one</Text>
          </Pressable>
        </View>
      </Card>


      <View style={styles.sectionHead}>
        <MonoLabel>WORTH READING</MonoLabel>
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
            onPress={() => openLink(post.url)}
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

      <MonoLabel style={{ marginTop: 26 }}>IF IT’S URGENT</MonoLabel>
      <Card style={styles.helpCard}>
        {CRISIS_LINES.map((line, i) => {
          const divider = i < CRISIS_LINES.length - 1 && styles.helpDivider;
          const copy = (
            <>
              <View style={styles.helpCopy}>
                <Text style={styles.helpTitle}>{line.title}</Text>
                <Text style={styles.helpSub}>{line.sub}</Text>
              </View>
              {line.href && <Text style={styles.helpArrow}>→</Text>}
            </>
          );

          // A line without an href has nowhere to go — the EAP is your
          // district's. It reads as text rather than pretending to be a button.
          return line.href ? (
            <Pressable
              key={line.id}
              accessibilityRole="link"
              accessibilityLabel={line.title}
              onPress={() => openLink(line.href!)}
              style={[styles.helpRow, divider]}
            >
              {copy}
            </Pressable>
          ) : (
            <View key={line.id} style={[styles.helpRow, divider]}>
              {copy}
            </View>
          );
        })}
      </Card>

      <MonoLabel style={{ marginTop: 26 }}>HELP WHEN YOU NEED IT</MonoLabel>

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
        Sponsored placements are marked. They pay for the free tier, they never see your
        check-ins, and nothing here tells anyone you looked.
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
