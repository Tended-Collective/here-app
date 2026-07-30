import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Display, MonoLabel } from '../components/ui';
import { longDateLabel, todayISO } from '../lib/dates';
import { useStore } from '../store';
import { color, MOODS, radius, TAGS } from '../theme';

const sameTags = (a: string[], b: string[]) =>
  a.length === b.length && a.every((t) => b.includes(t));

export function TodayScreen() {
  const { entries, hydrated, saveCheckIn, practices, practiceDays, togglePracticeDay } = useStore();
  const today = todayISO();
  const stored = entries[today];

  const [mood, setMood] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);

  // The store hydrates from disk after first paint, so today's saved check-in is
  // pulled into the form once — after that the form owns the selection.
  useEffect(() => {
    if (!hydrated || restored) return;
    if (stored) {
      setMood(stored.score - 1);
      setTags(stored.tags);
    }
    setRestored(true);
  }, [hydrated, restored, stored]);

  const saved = !!stored && mood !== null && stored.score === mood + 1 && sameTags(stored.tags, tags);
  const label = saved ? 'Saved for today' : mood === null ? 'Select a rating to save' : 'Save today';

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  return (
    <View>
      <MonoLabel>{longDateLabel()}</MonoLabel>
      <Display style={{ marginTop: 12 }}>How was your day?</Display>

      <View style={styles.moods}>
        {MOODS.map((m, i) => {
          const on = mood === i;
          return (
            <Pressable
              key={m.label}
              onPress={() => setMood(i)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={m.label}
              style={[
                styles.moodRow,
                {
                  backgroundColor: on ? color.card : color.cardSoft,
                  borderWidth: on ? 2 : 1,
                  borderColor: on ? m.color : color.hairline,
                  boxShadow: on ? '0 2px 12px rgba(0,0,0,0.07)' : undefined,
                },
              ]}
            >
              <View
                style={[styles.moodDot, { backgroundColor: m.color, opacity: on ? 1 : 0.42 }]}
              />
              <Text style={styles.moodLabel}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <MonoLabel style={{ marginTop: 26 }}>WHAT AFFECTED IT · OPTIONAL</MonoLabel>
      <View style={styles.tags}>
        {TAGS.map((tag) => {
          const on = tags.includes(tag);
          return (
            <Pressable
              key={tag}
              onPress={() => toggleTag(tag)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[
                styles.tag,
                {
                  backgroundColor: on ? color.ink : color.card,
                  borderColor: on ? color.ink : color.outline,
                },
              ]}
            >
              <Text
                style={[
                  styles.tagLabel,
                  { color: on ? '#fff' : color.body, fontWeight: on ? '600' : '400' },
                ]}
              >
                {tag}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* The other half of the daily ask. Onboarding promises two things a day,
          so both are on the screen the app opens on rather than one here and one
          two tabs away. Ticks save on the tap — there is nothing to lose by not
          reaching the button. */}
      {practices.length > 0 && (
        <>
          <MonoLabel style={{ marginTop: 26 }}>WHAT YOU DID FOR YOURSELF</MonoLabel>
          <View style={styles.practices}>
            {practices.map((p) => {
              const done = (practiceDays[p.id] ?? []).includes(today);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => togglePracticeDay(p.id, today)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={p.label}
                  style={[
                    styles.practiceRow,
                    { borderColor: done ? p.border : color.hairline },
                  ]}
                >
                  <View
                    style={[
                      styles.practiceBox,
                      {
                        backgroundColor: done ? p.fill : 'transparent',
                        borderColor: done ? p.border : color.outline,
                      },
                    ]}
                  />
                  <Text style={[styles.practiceLabel, done && styles.practiceLabelOn]}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <Pressable
        onPress={() => mood !== null && saveCheckIn(mood + 1, tags)}
        disabled={mood === null}
        accessibilityRole="button"
        accessibilityState={{ disabled: mood === null }}
        style={[
          styles.save,
          { backgroundColor: mood === null ? color.track : color.ink },
        ]}
      >
        <Text style={[styles.saveLabel, { color: mood === null ? color.label : '#fff' }]}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  moods: {
    marginTop: 24,
    gap: 9,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    height: 62,
    paddingHorizontal: 18,
    borderRadius: radius.row,
  },
  moodDot: {
    width: 22,
    height: 22,
    borderRadius: 99,
  },
  moodLabel: {
    fontSize: 16.5,
    fontWeight: '600',
    color: color.ink,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  tagLabel: {
    fontSize: 14,
  },
  practices: {
    marginTop: 12,
    gap: 8,
  },
  practiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 50,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.row,
    borderWidth: 1,
    backgroundColor: color.card,
  },
  practiceBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  practiceLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: color.body,
  },
  practiceLabelOn: {
    color: color.ink,
    fontWeight: '600',
  },
  save: {
    height: 54,
    marginTop: 26,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: {
    fontSize: 16.5,
    fontWeight: '600',
  },
});
