import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSheets } from '../components/Sheet';
import { Body, Card, Display, Divider, MonoLabel, ScreenHeading } from '../components/ui';
import {
  shortDateLabel,
  WEEKDAY_SHORT,
  weekDates,
  weekdayName,
  weekStarts,
} from '../lib/dates';
import { useToday } from '../lib/useToday';
import { FREE_LIST_LIMIT, PRICING } from '../data/mock';
import { Entry, useStore } from '../store';
import { color, font, MOODS, monoLabel, radius } from '../theme';

const CHART_HEIGHT = 124;

/** Worst days are tallest: score 1 → 26% of the chart, score 5 → 76%. */
const barHeight = (score: number) => ((26 + (score - 1) * 12.5) / 100) * CHART_HEIGHT;

/**
 * Reads the week back to the teacher: which day was heaviest.
 *
 * It used to add "You named workload and no break both times it got heavy",
 * built from tags picked after each check-in. The tags are gone — they were
 * collected every day and read by this one sentence and nothing else, which is
 * a lot to ask of someone at the end of a bad afternoon for a clause they might
 * see once a week.
 */
function insight(week: Entry[]): string {
  if (week.length === 0) {
    return 'No days logged yet this week. The chart fills in as you check in.';
  }
  const heaviest = week.reduce((a, b) => (b.score > a.score ? b : a));
  return `${weekdayName(heaviest.date)} was your heaviest day.`;
}

export function RecordScreen() {
  const { entries, plusActive, trialDaysLeft } = useStore();
  const { open } = useSheets();
  // Same fix as the habit grid: captured once on mount, this chart kept drawing
  // last week if the app was left open over a weekend.
  const today = useToday();

  // The record runs the school week, Monday to Friday.
  const days = useMemo(
    () => weekDates(new Date(`${today}T12:00:00`)).slice(0, 5),
    [today],
  );
  const logged = days.map((d) => entries[d]).filter(Boolean) as Entry[];

  /**
   * One entry per week for the last six, including the ones with nothing in
   * them. `average` is only meaningful where `days > 0`.
   */
  const sixWeeks = useMemo(() => {
    return weekStarts(6, new Date(`${today}T12:00:00`)).map((start) => {
      const dates = weekDates(new Date(`${start}T12:00:00`));
      const scores = dates.map((d) => entries[d]?.score).filter((n): n is number => !!n);
      const total = scores.reduce((a, b) => a + b, 0);
      return {
        start,
        days: scores.length,
        average: scores.length ? total / scores.length : 0,
      };
    });
  }, [entries, today]);
  const line = useMemo(() => insight(logged), [logged.map((e) => e.date + e.score).join()]);

  return (
    <View>
      <MonoLabel>YOUR RECORD</MonoLabel>
      <Display style={{ marginTop: 10 }}>This week</Display>

      <Card style={styles.chartCard}>
        <View style={styles.chart}>
          {days.map((date, i) => {
            const entry = entries[date];
            const isToday = date === today;
            // Days still to come recede; a day you simply haven't logged yet does not.
            const dim = !entry && date > today;
            return (
              <View key={date} style={[styles.column, { opacity: dim ? 0.4 : 1 }]}>
                {entry ? (
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight(entry.score),
                        backgroundColor: MOODS[entry.score - 1].fill,
                      },
                    ]}
                  />
                ) : (
                  <View style={styles.emptyBar} />
                )}
                <Text
                  style={[
                    monoLabel(10, 0, isToday),
                    { color: isToday ? color.ink : color.faint },
                  ]}
                >
                  {WEEKDAY_SHORT[i]}
                </Text>
              </View>
            );
          })}
        </View>

        <Divider style={styles.chartDivider} />

        <Text style={styles.insight}>{line}</Text>
      </Card>

      {plusActive ? (
        <View style={styles.plusCard}>
          <MonoLabel tone={color.accent}>HERE+ · TRIAL</MonoLabel>
          <Display size={27} lineHeight={1.15} style={{ marginTop: 10 }}>
            {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} left in your trial.
          </Display>
          <Body style={{ marginTop: 10 }}>
            Your full history is unlocked, and your list has no cap.
          </Body>
          <Pressable
            accessibilityRole="button"
            style={styles.manage}
            onPress={() => open('plus')}
          >
            <Text style={styles.manageLabel}>Manage trial</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.plusCard}>
          <MonoLabel tone={color.accent}>BEYOND THIS WEEK</MonoLabel>
          <Display size={27} lineHeight={1.15} style={{ marginTop: 10 }}>
            Keep more than seven days.
          </Display>
          <Body style={{ marginTop: 10 }}>
            The free plan shows this week and holds {FREE_LIST_LIMIT} things on your list. Here+
            keeps every check-in you have ever made — month and semester views, this year against
            last — shows six weeks of every item on your list, and lets the list run as long as you
            want.
          </Body>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{PRICING.price}</Text>
            <Text style={styles.cadence}>{PRICING.cadence}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            style={styles.cta}
            onPress={() => open('plus')}
          >
            <Text style={styles.ctaLabel}>{PRICING.cta}</Text>
          </Pressable>
        </View>
      )}

      {/* Six weeks, computed. This was a hardcoded polyline — the same
          invented line for everybody, drawn identically whether the term had
          gone well or badly, which is worse than no chart at all. It now reads
          the stored entries: one bar per week, the height being that week's
          average, and an empty slot where nothing was logged. A gap is a real
          finding, so the series is built from the last six Mondays rather than
          from whichever dates happen to have data. */}
      <View style={styles.sixHead}>
        <MonoLabel tone={plusActive ? color.accent : color.faint}>SIX WEEKS</MonoLabel>
        <MonoLabel em={0} tone={color.faint}>
          {plusActive ? 'HERE+' : 'HERE+ ONLY'}
        </MonoLabel>
      </View>
      <Card style={styles.lockedCard}>
        <View style={[styles.sixChart, !plusActive && styles.blurred]}>
          {sixWeeks.map((wk) => (
            <View key={wk.start} style={styles.sixCol}>
              <View style={styles.sixBarSlot}>
                {wk.days > 0 ? (
                  <View
                    style={[
                      styles.sixBar,
                      {
                        height: barHeight(wk.average),
                        backgroundColor: MOODS[Math.round(wk.average) - 1].fill,
                      },
                    ]}
                  />
                ) : (
                  <View style={styles.sixEmpty} />
                )}
              </View>
              <MonoLabel size={8.5} em={0.04} tone={color.fainter} style={styles.sixLabel}>
                {shortDateLabel(wk.start)}
              </MonoLabel>
            </View>
          ))}
        </View>

        {plusActive ? (
          <Body size={12.5} tone={color.muted} style={{ marginTop: 12 }}>
            {logged.length === 0 && sixWeeks.every((w) => w.days === 0)
              ? 'Nothing logged yet. Each bar fills in as a week goes by.'
              : `${sixWeeks.filter((w) => w.days > 0).length} of 6 weeks logged. Taller means a harder week.`}
          </Body>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="See six weeks with Here+"
            style={styles.sixCta}
            onPress={() => open('plus')}
          >
            <Text style={styles.sixCtaLabel}>See beyond this week with Here+ →</Text>
          </Pressable>
        )}
      </Card>

    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    marginTop: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  chart: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 7,
    height: '100%',
  },
  bar: {
    width: '100%',
    borderRadius: radius.bar,
  },
  emptyBar: {
    width: '100%',
    height: 14,
    borderRadius: radius.bar,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.18)',
  },
  chartDivider: {
    marginTop: 16,
    marginBottom: 14,
  },
  insight: {
    fontSize: 14,
    lineHeight: 21,
    color: color.body,
  },
  plusCard: {
    marginTop: 18,
    backgroundColor: color.card,
    borderWidth: 1.5,
    borderColor: color.accentBorder,
    borderRadius: radius.card,
    paddingVertical: 20,
    paddingHorizontal: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 16,
  },
  price: {
    fontFamily: font.displayRegular,
    fontSize: 28,
    color: color.ink,
  },
  cadence: {
    fontSize: 13,
    color: color.muted,
  },
  cta: {
    height: 50,
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  lockedCard: {
    marginTop: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  sixHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 26,
  },
  sixChart: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-end',
  },
  sixCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  sixBarSlot: {
    height: 96,
    width: '100%',
    justifyContent: 'flex-end',
  },
  sixBar: {
    width: '100%',
    borderRadius: radius.bar,
  },
  sixEmpty: {
    height: 3,
    width: '100%',
    borderRadius: 99,
    backgroundColor: color.track,
  },
  sixLabel: {
    textAlign: 'center',
  },
  blurred: {
    opacity: 0.28,
  },
  sixCta: {
    marginTop: 14,
  },
  sixCtaLabel: {
    fontSize: 13.5,
    color: color.accent,
  },
  manage: {
    height: 46,
    marginTop: 16,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: color.outlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.ink,
  },
});
