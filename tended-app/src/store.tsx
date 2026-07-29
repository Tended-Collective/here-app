/**
 * The whole app is a view of one small table: one row per day holding a score of
 * 1–5, optional tags, the date and (implicitly) the user's ZIP. The self-care
 * practices are the same shape — a day either has the practice kept or it doesn't.
 *
 * Everything here is the user's own data and never leaves the device. The map,
 * the nearby feed and the reading list are fixed sample content (see data/mock.ts).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ISODate, todayISO, weekDates, weekdayIndex } from './lib/dates';

const STORAGE_KEY = 'tended.v1';

export type Entry = {
  date: ISODate;
  /** 1 = Good … 5 = Rough. Index into MOODS is score - 1. */
  score: number;
  tags: string[];
};

export type Practice = {
  id: string;
  label: string;
  fill: string;
  border: string;
};

/**
 * Five tints at the practice ramp's own recipe — oklch(.72 .08 H) fill over
 * oklch(.6 .08 H) border — one step past the three hues the design specified
 * (150/100/75), so a practice added beyond the original three still reads as
 * part of the same system rather than reaching for an arbitrary colour.
 */
const PRACTICE_PALETTE: { fill: string; border: string }[] = [
  { fill: 'rgba(128,179,138,0.6)', border: 'rgba(92,142,103,0.5)' }, // 150
  { fill: 'rgba(176,166,107,0.6)', border: 'rgba(139,129,71,0.5)' }, // 100
  { fill: 'rgba(194,158,107,0.6)', border: 'rgba(156,121,71,0.5)' }, // 75
  { fill: 'rgba(209,148,127,0.6)', border: 'rgba(170,112,91,0.5)' }, // 40
  { fill: 'rgba(210,145,139,0.6)', border: 'rgba(171,109,104,0.5)' }, // 25
];

/** The three practices the user set up during onboarding — the seed default. */
function defaultPractices(): Practice[] {
  return [
    { id: 'lunch', label: 'Eat lunch sitting down', ...PRACTICE_PALETTE[0] },
    { id: 'leave', label: 'Out of the building by 4', ...PRACTICE_PALETTE[1] },
    { id: 'outside', label: 'Twenty minutes outside', ...PRACTICE_PALETTE[2] },
  ];
}

type Persisted = {
  entries: Record<ISODate, Entry>;
  /** The practices this teacher is tracking — editable, not fixed by the design. */
  practices: Practice[];
  /** practice id → the dates it was kept. */
  practiceDays: Record<string, ISODate[]>;
  /** One switch governs both the ZIP map and the live nearby feed. */
  contributing: boolean;
};

const EMPTY: Persisted = { entries: {}, practices: [], practiceDays: {}, contributing: true };

/**
 * First-run sample week, so a fresh install opens on the record the design shows
 * rather than an empty chart. Set to false for a genuinely blank first run.
 */
const SEED_FIRST_RUN = true;

function seed(): Persisted {
  const week = weekDates();
  const today = weekdayIndex();

  // Mon–Thu of the design's week: worn down, good, rough, running empty.
  const days: { score: number; tags: string[] }[] = [
    { score: 3, tags: ['Workload'] },
    { score: 1, tags: [] },
    { score: 5, tags: ['Workload', 'No break'] },
    { score: 4, tags: ['Workload', 'No break'] },
    { score: 2, tags: ['Sleep'] },
  ];
  const entries: Record<ISODate, Entry> = {};
  for (let i = 0; i < days.length && i < today; i++) {
    entries[week[i]] = { date: week[i], score: days[i].score, tags: days[i].tags };
  }

  // The prototype's practice grid, clipped to days that have actually happened.
  const kept: boolean[][] = [
    [true, false, true, false, false, false, false],
    [true, true, true, true, false, false, false],
    [false, true, false, false, false, false, false],
  ];
  const practices = defaultPractices();
  const practiceDays: Record<string, ISODate[]> = {};
  practices.forEach((p, pi) => {
    practiceDays[p.id] = week.filter((_, di) => di <= today && kept[pi][di]);
  });

  return { entries, practices, practiceDays, contributing: true };
}

type StoreValue = Persisted & {
  hydrated: boolean;
  saveCheckIn: (score: number, tags: string[]) => void;
  clearCheckIn: () => void;
  togglePracticeDay: (practiceId: string, date: ISODate) => void;
  addPractice: (label: string) => void;
  removePractice: (practiceId: string) => void;
  setContributing: (on: boolean) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Persisted>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next = SEED_FIRST_RUN ? seed() : EMPTY;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) next = { ...EMPTY, ...(JSON.parse(raw) as Partial<Persisted>) };
      } catch {
        // A corrupt or unreadable payload falls back to the default state rather
        // than blocking the check-in.
      }
      if (!cancelled) {
        setData(next);
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((fn: (prev: Persisted) => Persisted) => {
    setData((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ...data,
      hydrated,
      saveCheckIn: (score, tags) =>
        update((prev) => {
          const date = todayISO();
          return { ...prev, entries: { ...prev.entries, [date]: { date, score, tags } } };
        }),
      clearCheckIn: () =>
        update((prev) => {
          const entries = { ...prev.entries };
          delete entries[todayISO()];
          return { ...prev, entries };
        }),
      togglePracticeDay: (practiceId, date) =>
        update((prev) => {
          const current = prev.practiceDays[practiceId] ?? [];
          const next = current.includes(date)
            ? current.filter((d) => d !== date)
            : [...current, date];
          return { ...prev, practiceDays: { ...prev.practiceDays, [practiceId]: next } };
        }),
      addPractice: (label) =>
        update((prev) => {
          const trimmed = label.trim();
          if (!trimmed) return prev;
          const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
          const tint = PRACTICE_PALETTE[prev.practices.length % PRACTICE_PALETTE.length];
          return { ...prev, practices: [...prev.practices, { id, label: trimmed, ...tint }] };
        }),
      removePractice: (practiceId) =>
        update((prev) => {
          const practiceDays = { ...prev.practiceDays };
          delete practiceDays[practiceId];
          return {
            ...prev,
            practices: prev.practices.filter((p) => p.id !== practiceId),
            practiceDays,
          };
        }),
      setContributing: (on) => update((prev) => ({ ...prev, contributing: on })),
    }),
    [data, hydrated, update],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside <StoreProvider>');
  return value;
}
