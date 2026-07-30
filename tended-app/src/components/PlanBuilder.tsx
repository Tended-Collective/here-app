/**
 * The self-care plan builder: boundaries, habits, contacts.
 *
 * Habits are the app's existing practices rather than a second tracker beside
 * them — the Support tab already has a seven-day grid, and two habit systems on
 * one screen would be one too many. `savePlan` matches habits by label so an
 * edit that keeps a habit keeps its colour and its tick history.
 *
 * The three steps are ordered by how much they ask. Boundaries are a tap,
 * habits are a tap, contacts need typing and are the only step that can be left
 * empty without weakening the plan.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BOUNDARY_SUGGESTIONS, PRACTICE_SUGGESTIONS } from '../data/mock';
import { Contact, useStore } from '../store';
import { color, radius } from '../theme';
import { SheetShell } from './Sheet';
import { Body, Display, MonoLabel } from './ui';

const MAX_BOUNDARIES = 5;
const MAX_HABITS = 5;

const STEPS = [
  { kicker: 'STEP 1 OF 3', title: 'Set your boundaries', body: 'Rules you want to hold to. Pick up to 5.' },
  { kicker: 'STEP 2 OF 3', title: 'Choose daily habits', body: 'Tracked day by day on the plan card. Pick up to 5.' },
  { kicker: 'STEP 3 OF 3', title: 'Add support contacts', body: 'Who to call on a bad day. Stored on this device only.' },
];

export function PlanBuilder({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { boundaries, practices, contacts, savePlan } = useStore();
  const [step, setStep] = useState(0);

  const [chosenBoundaries, setChosenBoundaries] = useState<string[]>(
    boundaries.map((b) => b.label),
  );
  const [chosenHabits, setChosenHabits] = useState<string[]>(practices.map((p) => p.label));
  const [people, setPeople] = useState<Contact[]>(contacts);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const pick = (
    list: string[],
    set: (next: string[]) => void,
    max: number,
    label: string,
  ) =>
    set(
      list.includes(label)
        ? list.filter((l) => l !== label)
        : list.length >= max
          ? list
          : [...list, label],
    );

  const addPerson = () => {
    if (!name.trim()) return;
    setPeople((prev) => [
      ...prev,
      { id: `c${Date.now().toString(36)}`, name: name.trim(), phone: phone.trim() },
    ]);
    setName('');
    setPhone('');
  };

  const finish = () => {
    savePlan({ boundaries: chosenBoundaries, habits: chosenHabits, contacts: people });
    setStep(0);
    onClose();
  };

  const current = STEPS[step];

  return (
    <SheetShell visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <View style={styles.progress}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.pip, i <= step && styles.pipOn]} />
          ))}
        </View>

        <MonoLabel tone={color.accent}>{current.kicker}</MonoLabel>
        <Display size={25} lineHeight={1.2} style={{ marginTop: 8 }}>
          {current.title}
        </Display>
        <Body size={13.5} tone={color.muted} style={{ marginTop: 8 }}>
          {current.body}
        </Body>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {step === 0 && (
            <Chips
              options={BOUNDARY_SUGGESTIONS}
              chosen={chosenBoundaries}
              onToggle={(l) =>
                pick(chosenBoundaries, setChosenBoundaries, MAX_BOUNDARIES, l)
              }
            />
          )}

          {step === 1 && (
            <Chips
              options={PRACTICE_SUGGESTIONS}
              chosen={chosenHabits}
              onToggle={(l) => pick(chosenHabits, setChosenHabits, MAX_HABITS, l)}
            />
          )}

          {step === 2 && (
            <View style={styles.contacts}>
              {people.map((person) => (
                <View key={person.id} style={styles.personRow}>
                  <View style={styles.personCopy}>
                    <Text style={styles.personName}>{person.name}</Text>
                    {!!person.phone && <Text style={styles.personPhone}>{person.phone}</Text>}
                  </View>
                  <Pressable
                    onPress={() => setPeople((prev) => prev.filter((p) => p.id !== person.id))}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${person.name}`}
                    hitSlop={8}
                  >
                    <Text style={styles.remove}>Remove</Text>
                  </Pressable>
                </View>
              ))}

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={color.faint}
                style={styles.input}
                accessibilityLabel="Contact name"
              />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone (optional)"
                placeholderTextColor={color.faint}
                style={styles.input}
                keyboardType="phone-pad"
                accessibilityLabel="Contact phone number, optional"
              />
              <Pressable
                onPress={addPerson}
                disabled={!name.trim()}
                accessibilityRole="button"
                style={[styles.add, { opacity: name.trim() ? 1 : 0.4 }]}
              >
                <Text style={styles.addLabel}>Add contact</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        <Pressable
          onPress={() => (step === STEPS.length - 1 ? finish() : setStep(step + 1))}
          accessibilityRole="button"
          style={styles.primary}
        >
          <Text style={styles.primaryLabel}>
            {step === STEPS.length - 1 ? 'Save plan' : 'Next'}
          </Text>
        </Pressable>

        <View style={styles.foot}>
          {step > 0 ? (
            <Pressable onPress={() => setStep(step - 1)} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.quiet}>Back</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.quiet}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </SheetShell>
  );
}

function Chips({
  options,
  chosen,
  onToggle,
}: {
  options: readonly string[];
  chosen: string[];
  onToggle: (label: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((label) => {
        const on = chosen.includes(label);
        return (
          <Pressable
            key={label}
            onPress={() => onToggle(label)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: 20,
    paddingBottom: 26,
  },
  progress: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 18,
  },
  pip: {
    flex: 1,
    height: 3,
    borderRadius: 99,
    backgroundColor: color.track,
  },
  pipOn: {
    backgroundColor: color.accent,
  },
  // Bounded so a long list scrolls inside the sheet instead of pushing the
  // buttons off the bottom of the phone.
  scroll: {
    maxHeight: 260,
    marginTop: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
  },
  chipOn: {
    borderColor: color.accentBorderSoft,
    backgroundColor: 'rgba(23,96,107,0.06)',
  },
  chipLabel: {
    fontSize: 14,
    color: color.body,
  },
  chipLabelOn: {
    color: color.accent,
    fontWeight: '600',
  },
  contacts: {
    gap: 10,
    paddingBottom: 4,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  personCopy: {
    flex: 1,
  },
  personName: {
    fontSize: 15,
    fontWeight: '600',
    color: color.ink,
  },
  personPhone: {
    fontSize: 13,
    color: color.muted,
    marginTop: 2,
  },
  remove: {
    fontSize: 13,
    color: color.label,
  },
  input: {
    height: 46,
    paddingHorizontal: 15,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.card,
    fontSize: 14,
    color: color.ink,
    outlineColor: color.accent,
    outlineWidth: 2,
    outlineOffset: 1,
  },
  add: {
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: color.ink,
  },
  primary: {
    height: 52,
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  quiet: {
    fontSize: 14,
    color: color.muted,
    paddingVertical: 10,
  },
});
