import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { Body, Card, Display, Divider, MonoLabel, ScreenHeading } from '../components/ui';
import { todayISO, WEEKDAY_SHORT, weekDates, weekdayName } from '../lib/dates';
import { LOCKED_TREND, PRICING } from '../data/mock';
import { Entry, useStore } from '../store';
import { color, font, MOODS, monoLabel, radius } from '../theme';

const CHART_HEIGHT = 124;

/** Worst days are tallest: score 1 → 26% of the chart, score 5 → 76%. */
const barHeight = (score: number) => ((26 + (score - 1) * 12.5) / 100) * CHART_HEIGHT;

type Part = { text: string; bold?: boolean };

/** Reads the week back to the teacher: heaviest day, then what they named on it. */
function insight(week: Entry[]): Part[] {
  if (week.length === 0) {
    return [{ text: 'No days logged yet this week. The chart fills in as you check in.' }];
  }

  const heaviest = week.reduce((a, b) => (b.score > a.score ? b : a));
  const parts: Part[] = [
    { text: `${weekdayName(heaviest.date)} was your heaviest day.` },
  ];

  const heavy = week.filter((e) => e.score >= 4);
  const source = heavy.length ? heavy : week;
  const counts = new Map<string, number>();
  source.forEach((e) => e.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t);

  if (top.length === 0) return parts;

  parts.push({ text: ' You named ' });
  top.forEach((tag, i) => {
    if (i > 0) parts.push({ text: ' and ' });
    parts.push({ text: tag.toLowerCase(), bold: true });
  });

  if (heavy.length >= 2) {
    parts.push({ text: heavy.length === 2 ? ' both times it got heavy.' : ' most times it got heavy.' });
  } else if (heavy.length === 1) {
    parts.push({ text: ' the day it got heavy.' });
  } else {
    parts.push({ text: ' this week.' });
  }

  return parts;
}

export function RecordScreen() {
  const { entries } = useStore();
  const today = todayISO();

  // The record runs the school week, Monday to Friday.
  const days = useMemo(() => weekDates().slice(0, 5), []);
  const logged = days.map((d) => entries[d]).filter(Boolean) as Entry[];
  const parts = useMemo(() => insight(logged), [logged.map((e) => e.date + e.score).join()]);

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

        <Text style={styles.insight}>
          {parts.map((p, i) => (
            <Text key={i} style={p.bold ? styles.insightStrong : undefined}>
              {p.text}
            </Text>
          ))}
        </Text>
      </Card>

      <View style={styles.plusCard}>
        <MonoLabel tone={color.accent}>BEYOND SEVEN DAYS</MonoLabel>
        <Display size={27} lineHeight={1.15} style={{ marginTop: 10 }}>
          See the shape of a whole term.
        </Display>
        <Body style={{ marginTop: 10 }}>
          The free record keeps your last seven days. Tended+ keeps everything: month and term
          views, October against last October, the patterns behind your heavy days, and an export
          you can hand a therapist.
        </Body>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{PRICING.price}</Text>
          <Text style={styles.cadence}>{PRICING.cadence}</Text>
        </View>
        <Pressable accessibilityRole="button" style={styles.cta}>
          <Text style={styles.ctaLabel}>{PRICING.cta}</Text>
        </Pressable>
      </View>

      <Card style={styles.lockedCard}>
        <MonoLabel tone={color.faint}>SIX WEEKS · TENDED+</MonoLabel>
        <View style={styles.lockedChart}>
          <Svg viewBox="0 0 300 90" width="100%" height={90}>
            <Polyline
              points={LOCKED_TREND}
              fill="none"
              stroke={color.accent}
              strokeWidth={2.2}
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <View style={styles.lockedOverlay} pointerEvents="none">
          <View style={styles.lockedPill}>
            <MonoLabel size={11} em={0.12} bold tone={color.muted}>
              LOCKED
            </MonoLabel>
          </View>
        </View>
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
  insightStrong: {
    color: color.ink,
    fontWeight: '700',
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
  lockedChart: {
    marginTop: 10,
    opacity: 0.22,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedPill: {
    backgroundColor: color.ground,
    borderWidth: 1,
    borderColor: color.outline,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 15,
  },
});
