import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InviteCard } from '../components/InviteCard';
import { NearbyFeed } from '../components/NearbyFeed';
import { Body, Card, Display, MonoLabel } from '../components/ui';
import { Toggle } from '../components/Toggle';
import { AREA, HEAT_CELLS, NAMED_CAUSES } from '../data/mock';
import { useStore } from '../store';
import { color, HEAT_LEGEND, HEAT_RAMP, radius } from '../theme';

export function AreaScreen() {
  const { contributing, setContributing, entries, zip } = useStore();
  // Your own check-ins, counted rather than asserted. The figures around the
  // map are still sample content standing in for a backend (data/mock.ts).
  const counted = Object.keys(entries).length;

  return (
    <View>
      <MonoLabel>ANONYMOUS · {AREA.totalTeachers} TEACHERS</MonoLabel>
      <Display style={{ marginTop: 10 }}>Your area this week</Display>

      <Card style={styles.mapCard}>
        <View style={styles.grid}>
          {HEAT_CELLS.map((row, ri) => (
            <View key={ri} style={styles.gridRow}>
              {row.map((v, ci) => (
                <View
                  key={ci}
                  style={[
                    styles.cell,
                    v > 0 && { backgroundColor: HEAT_RAMP[v - 1], borderRadius: radius.tile },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.legend}>
          <MonoLabel size={9.5} tone={color.faint} em={0}>
            STEADY
          </MonoLabel>
          <LinearGradient
            colors={HEAT_LEGEND as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.legendBar}
          />
          <MonoLabel size={9.5} tone={color.faint} em={0}>
            ROUGH
          </MonoLabel>
        </View>
        <MonoLabel size={9} em={0.1} tone={color.fainter} style={{ marginTop: 8 }}>
          ZIP TILES · SCHEMATIC, NOT TRUE GEOGRAPHY
        </MonoLabel>
      </Card>

      <Card style={styles.zipCard}>
        <View style={styles.zipHead}>
          <Text style={styles.zipTitle}>{zip ?? AREA.zip} · your ZIP</Text>
          <MonoLabel em={0}>{AREA.zipTeachers}</MonoLabel>
        </View>
      </Card>

      <MonoLabel style={{ marginTop: 22 }}>WHAT PEOPLE NAMED HERE</MonoLabel>
      <Card style={styles.causeCard}>
        {NAMED_CAUSES.map((cause, i) => (
          <View
            key={cause.label}
            style={[styles.causeRow, i < NAMED_CAUSES.length - 1 && styles.rowDivider]}
          >
            <Text style={styles.causeLabel}>{cause.label}</Text>
            <View style={styles.causeTrack}>
              <View
                style={[
                  styles.causeFill,
                  { width: `${cause.share * 100}%`, backgroundColor: cause.color },
                ]}
              />
            </View>
          </View>
        ))}
      </Card>

      <Card style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={styles.toggleTitle}>Include my check-ins</Text>
            <Body size={12.5} tone={color.muted} style={{ marginTop: 3 }}>
              ZIP only, never your school. A ZIP needs 40+ teachers before it appears at all.
            </Body>
          </View>
          <Toggle
            value={contributing}
            onChange={setContributing}
            label="Include my check-ins in the area map and nearby feed"
          />
        </View>
        <Text style={styles.toggleStatus}>
          {contributing
            ? `Included · ${counted} ${counted === 1 ? 'check-in' : 'check-ins'} counted`
            : 'Not included. The map still works; your days stay only here.'}
        </Text>
      </Card>

      <View style={styles.feedHead}>
        <MonoLabel>LIVE NEARBY</MonoLabel>
        <View style={styles.badge}>
          <MonoLabel size={9} em={0.08} tone={color.accent}>
            EXPLORING
          </MonoLabel>
        </View>
      </View>

      <NearbyFeed />

      <InviteCard />
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    marginTop: 20,
    padding: 14,
  },
  grid: {
    gap: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  legendBar: {
    flex: 1,
    height: 7,
    borderRadius: 99,
  },
  zipCard: {
    marginTop: 18,
    padding: 18,
  },
  zipHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  zipTitle: {
    fontSize: 16.5,
    fontWeight: '600',
    color: color.ink,
  },
  causeCard: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  causeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
  },
  causeLabel: {
    flex: 1,
    fontSize: 15,
    color: color.ink,
  },
  causeTrack: {
    width: 84,
    height: 7,
    borderRadius: 99,
    backgroundColor: color.track,
    overflow: 'hidden',
  },
  causeFill: {
    height: 7,
    borderRadius: 99,
  },
  toggleCard: {
    marginTop: 18,
    padding: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  toggleCopy: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15.5,
    fontWeight: '600',
    color: color.ink,
  },
  toggleStatus: {
    fontSize: 12.5,
    color: color.label,
    marginTop: 12,
  },
  feedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 26,
  },
  badge: {
    height: 20,
    paddingHorizontal: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: color.accentBorderSoft,
    justifyContent: 'center',
  },
});
