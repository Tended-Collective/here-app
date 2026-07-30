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
import { TRIAL_DAYS } from './data/mock';
import { ISODate, todayISO, weekDates, weekdayIndex } from './lib/dates';
import { generateInviteCode, INVITES_PER_TEACHER } from './lib/invites';

const STORAGE_KEY = 'tended.v1';

export type Entry = {
  date: ISODate;
  /** 1 = Great … 5 = Rough, evenly spread. Index into MOODS is score - 1. */
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

/** A standing rule. Either in force or not — unlike a habit, it is not ticked. */
export type Boundary = { id: string; label: string; active: boolean };

/**
 * Someone to call on a bad day. This is the only place the app holds a name and
 * a number, it is the teacher's own address book rather than ours, and like
 * everything else in this store it stays on the device.
 */
export type Contact = { id: string; name: string; phone: string };

/** One sentence the teacher posted to the nearby feed. */
export type Update = {
  id: string;
  text: string;
  /** Epoch milliseconds, so the feed can age the label as time passes. */
  at: number;
};

type Persisted = {
  entries: Record<ISODate, Entry>;
  /** The practices this teacher is tracking — editable, not fixed by the design. */
  practices: Practice[];
  /** practice id → the dates it was kept. */
  practiceDays: Record<string, ISODate[]>;
  /** One switch governs both the ZIP map and the live nearby feed. */
  contributing: boolean;
  /** The teacher's own updates. Newest first. */
  updates: Update[];
  /**
   * Tended+ trial state. Device-local, and only good enough to drive the
   * preview: real entitlement belongs on a server behind a validated receipt
   * (see lib/billing.ts). `trialStartedAt` is epoch milliseconds.
   */
  plus: { trialStartedAt: number | null };
  /** Null until onboarding is finished; the app opens on it while it is. */
  onboardedAt: number | null;
  /**
   * All that survives verification. Not the address and not the domain — a
   * school domain names a building, and a building plus a daily mood is most of
   * the way to naming a person. See lib/verification.ts.
   */
  educator: { verified: boolean; verifiedAt: number | null };
  /** The unit the area view aggregates on. Given during onboarding. */
  zip: string | null;
  /** Codes this teacher has handed out. Capped by INVITES_PER_TEACHER. */
  invites: { code: string; createdAt: number }[];
  /** The self-care plan's standing rules. */
  boundaries: Boundary[];
  /** Who to call. Local only, never sent anywhere. */
  contacts: Contact[];
  /**
   * Which reactions this teacher has sent, keyed by the update they were sent
   * to. The sample feed's own counts live in data/mock.ts; these add to them.
   */
  reactions: Record<string, string[]>;
};

const EMPTY: Persisted = {
  entries: {},
  practices: [],
  practiceDays: {},
  contributing: true,
  updates: [],
  reactions: {},
  plus: { trialStartedAt: null },
  onboardedAt: null,
  educator: { verified: false, verifiedAt: null },
  zip: null,
  invites: [],
  boundaries: [],
  contacts: [],
};

/**
 * First-run sample week, so a fresh install opens on the record the design shows
 * rather than an empty chart. Set to false for a genuinely blank first run.
 */
const SEED_FIRST_RUN = true;

function seed(): Persisted {
  const week = weekDates();
  const today = weekdayIndex();

  // A sample week on the even scale: okay, great, rough, worn down, good.
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

  return { ...EMPTY, entries, practices, practiceDays, contributing: true };
}

type StoreValue = Persisted & {
  hydrated: boolean;
  /** True while the trial has days left on it. */
  plusActive: boolean;
  /** Whole days remaining, 0 when there is no trial. */
  trialDaysLeft: number;
  saveCheckIn: (score: number, tags: string[]) => void;
  clearCheckIn: () => void;
  togglePracticeDay: (practiceId: string, date: ISODate) => void;
  addPractice: (label: string) => void;
  removePractice: (practiceId: string) => void;
  setContributing: (on: boolean) => void;
  postUpdate: (text: string) => void;
  removeUpdate: (id: string) => void;
  toggleReaction: (updateId: string, reactionId: string) => void;
  startTrial: () => void;
  endTrial: () => void;
  /** Finishes onboarding: the practices chosen, the ZIP, whether they verified. */
  completeOnboarding: (input: { practices: string[]; zip: string; verified: boolean }) => void;
  /** For "verify later" — the feed and area view ask again from inside the app. */
  setVerified: (verified: boolean) => void;
  /** Mints one more invite, up to the cap. */
  createInvite: () => void;
  /** Writes the whole plan at once, as the builder produces it. */
  savePlan: (input: { boundaries: string[]; habits: string[]; contacts: Contact[] }) => void;
  /** Quick on/off from the summary card. */
  toggleBoundary: (id: string) => void;
  /** Takes something from the feed into this teacher's own plan. */
  adoptFromFeed: (kind: 'boundary' | 'habit', label: string) => void;
};

/** Whole days left on a trial that began at `startedAt`. */
export function trialDaysRemaining(startedAt: number | null, now: number = Date.now()): number {
  if (startedAt === null) return 0;
  const elapsed = now - startedAt;
  const total = TRIAL_DAYS * 24 * 60 * 60 * 1000;
  if (elapsed >= total) return 0;
  return Math.max(1, Math.ceil((total - elapsed) / (24 * 60 * 60 * 1000)));
}

/** Long enough for a sentence, short enough that it stays one. */
export const UPDATE_MAX_LENGTH = 140;

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

  const daysLeft = trialDaysRemaining(data.plus.trialStartedAt);

  const value = useMemo<StoreValue>(
    () => ({
      ...data,
      hydrated,
      plusActive: daysLeft > 0,
      trialDaysLeft: daysLeft,
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
      postUpdate: (text) =>
        update((prev) => {
          const trimmed = text.trim().slice(0, UPDATE_MAX_LENGTH);
          if (!trimmed) return prev;
          const entry: Update = {
            id: `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            text: trimmed,
            at: Date.now(),
          };
          return { ...prev, updates: [entry, ...prev.updates] };
        }),
      removeUpdate: (id) =>
        update((prev) => ({ ...prev, updates: prev.updates.filter((u) => u.id !== id) })),
      toggleReaction: (updateId, reactionId) =>
        update((prev) => {
          const current = prev.reactions[updateId] ?? [];
          const next = current.includes(reactionId)
            ? current.filter((r) => r !== reactionId)
            : [...current, reactionId];
          const reactions = { ...prev.reactions };
          // Drop the key entirely rather than leaving an empty array behind.
          if (next.length === 0) delete reactions[updateId];
          else reactions[updateId] = next;
          return { ...prev, reactions };
        }),
      startTrial: () =>
        update((prev) =>
          // Starting again while one is running would silently extend it.
          trialDaysRemaining(prev.plus.trialStartedAt) > 0
            ? prev
            : { ...prev, plus: { trialStartedAt: Date.now() } },
        ),
      endTrial: () => update((prev) => ({ ...prev, plus: { trialStartedAt: null } })),
      completeOnboarding: ({ practices: labels, zip, verified }) =>
        update((prev) => ({
          ...prev,
          onboardedAt: Date.now(),
          zip: zip.trim() || null,
          educator: { verified, verifiedAt: verified ? Date.now() : null },
          practices: labels.map((label, i) => ({
            id: `p${i}${Date.now().toString(36)}`,
            label,
            ...PRACTICE_PALETTE[i % PRACTICE_PALETTE.length],
          })),
          // The chosen practices are new rows; any ticks the seed left behind
          // are keyed to practices that no longer exist.
          practiceDays: {},
        })),
      setVerified: (verified) =>
        update((prev) => ({
          ...prev,
          educator: { verified, verifiedAt: verified ? Date.now() : null },
        })),
      savePlan: ({ boundaries, habits, contacts }) =>
        update((prev) => {
          // Habits are the existing practices, matched by label so a habit that
          // survives an edit keeps its colour and its tick history.
          const byLabel = new Map(prev.practices.map((p) => [p.label, p]));
          const practices = habits.map((label, i) => {
            const kept = byLabel.get(label);
            return (
              kept ?? {
                id: `p${i}${Date.now().toString(36)}`,
                label,
                ...PRACTICE_PALETTE[i % PRACTICE_PALETTE.length],
              }
            );
          });
          // Ticks belonging to dropped habits go with them.
          const live = new Set(practices.map((p) => p.id));
          const practiceDays: Record<string, ISODate[]> = {};
          Object.entries(prev.practiceDays).forEach(([id, dates]) => {
            if (live.has(id)) practiceDays[id] = dates;
          });

          const existing = new Map(prev.boundaries.map((b) => [b.label, b]));
          return {
            ...prev,
            practices,
            practiceDays,
            contacts,
            boundaries: boundaries.map((label, i) => ({
              id: existing.get(label)?.id ?? `b${i}${Date.now().toString(36)}`,
              label,
              // A rule already in place stays as the teacher left it.
              active: existing.get(label)?.active ?? true,
            })),
          };
        }),
      adoptFromFeed: (kind, label) =>
        update((prev) => {
          if (kind === 'boundary') {
            // Adding the same rule twice would just clutter the card.
            if (prev.boundaries.some((b) => b.label === label)) return prev;
            return {
              ...prev,
              boundaries: [
                ...prev.boundaries,
                { id: `b${Date.now().toString(36)}`, label, active: true },
              ],
            };
          }
          if (prev.practices.some((p) => p.label === label)) return prev;
          return {
            ...prev,
            practices: [
              ...prev.practices,
              {
                id: `p${Date.now().toString(36)}`,
                label,
                ...PRACTICE_PALETTE[prev.practices.length % PRACTICE_PALETTE.length],
              },
            ],
          };
        }),
      toggleBoundary: (id) =>
        update((prev) => ({
          ...prev,
          boundaries: prev.boundaries.map((b) =>
            b.id === id ? { ...b, active: !b.active } : b,
          ),
        })),
      createInvite: () =>
        update((prev) =>
          prev.invites.length >= INVITES_PER_TEACHER
            ? prev
            : {
                ...prev,
                invites: [
                  ...prev.invites,
                  { code: generateInviteCode(), createdAt: Date.now() },
                ],
              },
        ),
    }),
    [data, hydrated, daysLeft, update],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside <StoreProvider>');
  return value;
}
