/**
 * Claiming a username, with the answer arriving while you type.
 *
 * Shared by onboarding and the profile so the rules cannot drift between the
 * place a username is first taken and the place it is changed. The states it
 * has to render are the reason this is a component rather than a TextInput:
 * idle, too short, malformed, checking, taken (with alternatives), free.
 *
 * The check is debounced rather than fired per keystroke — every character of
 * "marisa.okonjo" would otherwise be a request, and twelve of those answers are
 * about a username nobody was trying to claim. A stale reply is discarded by
 * sequence number, so a slow answer for an earlier draft cannot overwrite the
 * verdict for what is currently in the box.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Availability,
  checkUsername,
  normalizeUsername,
  problemMessage,
  suggestUsernames,
  USERNAME_MIN,
  validateUsername,
} from '../lib/usernames';
import { color, radius } from '../theme';
import { MonoLabel } from './ui';

export type UsernameState = 'empty' | 'invalid' | 'checking' | 'taken' | 'available';

export function UsernameField({
  value,
  onChange,
  taken,
  onStateChange,
  autoFocus,
}: {
  value: string;
  onChange: (next: string) => void;
  /** The directory to collide against. The server holds the real one. */
  taken: string[];
  onStateChange?: (state: UsernameState) => void;
  autoFocus?: boolean;
}) {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [checking, setChecking] = useState(false);
  const sequence = useRef(0);

  const normalized = normalizeUsername(value);
  const validity = validateUsername(value);
  // An empty box is not an error — it is a question that has not been answered
  // yet, and colouring it red before they have typed is just scolding.
  const untouched = normalized.length === 0;

  const state: UsernameState = untouched
    ? 'empty'
    : !validity.ok
      ? 'invalid'
      : checking
        ? 'checking'
        : availability === 'taken'
          ? 'taken'
          : availability === 'available'
            ? 'available'
            : 'checking';

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  useEffect(() => {
    if (untouched || !validity.ok) {
      setAvailability(null);
      setChecking(false);
      return;
    }

    const ticket = ++sequence.current;
    setChecking(true);
    const timer = setTimeout(async () => {
      const result = await checkUsername(normalized, taken);
      // Only the most recent request may write. Anything older is answering a
      // question the box no longer asks.
      if (ticket !== sequence.current) return;
      setAvailability(result);
      setChecking(false);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized, untouched, validity.ok]);

  const suggestions = state === 'taken' ? suggestUsernames(normalized, taken) : [];

  return (
    <View>
      <View
        style={[
          styles.field,
          state === 'available' && styles.fieldGood,
          (state === 'taken' || state === 'invalid') && styles.fieldBad,
        ]}
      >
        <Text style={styles.at}>@</Text>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(normalizeUsername(t))}
          placeholder="username"
          placeholderTextColor={color.faint}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          accessibilityLabel="Your username, unique across Tended"
        />
        {state === 'checking' && <ActivityIndicator size="small" color={color.faint} />}
        {state === 'available' && <Text style={styles.tick}>✓</Text>}
      </View>

      <Text
        style={[
          styles.note,
          state === 'available' && styles.noteGood,
          (state === 'taken' || state === 'invalid') && styles.noteBad,
        ]}
      >
        {state === 'empty'
          ? `One per person, ${USERNAME_MIN}+ characters. This is how people follow you.`
          : state === 'invalid'
            ? problemMessage((validity as { ok: false; reason: never }).reason)
            : state === 'checking'
              ? 'Checking…'
              : state === 'taken'
                ? `@${normalized} is taken.`
                : `@${normalized} is yours.`}
      </Text>

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          <MonoLabel size={9} em={0.1} tone={color.faint}>
            FREE
          </MonoLabel>
          <View style={styles.suggestionRow}>
            {suggestions.map((s) => (
              <Pressable
                key={s}
                onPress={() => onChange(s)}
                accessibilityRole="button"
                accessibilityLabel={`Use @${s}`}
                style={styles.suggestion}
              >
                <Text style={styles.suggestionLabel}>@{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 50,
    marginTop: 10,
    paddingHorizontal: 14,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.card,
  },
  fieldGood: {
    borderColor: color.accentBorderSoft,
  },
  fieldBad: {
    borderColor: 'rgba(180,103,98,0.55)',
  },
  at: {
    fontSize: 15,
    color: color.faint,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: color.ink,
    outlineColor: color.accent,
    outlineWidth: 2,
    outlineOffset: 1,
  },
  tick: {
    fontSize: 14,
    fontWeight: '700',
    color: color.accent,
  },
  note: {
    fontSize: 12.5,
    lineHeight: 19,
    color: color.label,
    marginTop: 8,
  },
  noteGood: {
    color: color.accent,
  },
  noteBad: {
    color: '#a4574f',
  },
  suggestions: {
    marginTop: 10,
    gap: 7,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestion: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.accentBorderSoft,
  },
  suggestionLabel: {
    fontSize: 13,
    color: color.accent,
  },
});
