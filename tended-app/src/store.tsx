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
import { FREE_LIST_LIMIT, TRIAL_DAYS } from './data/mock';
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
 * oklch(.6 .08 H) border — so an item added beyond the first still reads as
 * part of the same system rather than reaching for an arbitrary colour.
 *
 * The hue walk runs green to blue, and deliberately stops before the warm half.
 * It used to run 150 → 25, which is the mood ramp's own path: the fifth item on
 * the list came out the exact red that means "Rough" everywhere else in the
 * app, so a kept habit was drawn in the colour of a bad day. These are five
 * ways to tell rows apart, not a scale, and nothing here should imply a verdict.
 */
const PRACTICE_PALETTE: { fill: string; border: string }[] = [
  { fill: 'rgba(128,179,138,0.6)', border: 'rgba(92,142,103,0.5)' }, // 150
  { fill: 'rgba(120,180,152,0.6)', border: 'rgba(86,143,118,0.5)' }, // 165
  { fill: 'rgba(112,180,168,0.6)', border: 'rgba(80,143,133,0.5)' }, // 180
  { fill: 'rgba(108,178,184,0.6)', border: 'rgba(76,141,147,0.5)' }, // 195
  { fill: 'rgba(112,175,197,0.6)', border: 'rgba(80,138,158,0.5)' }, // 210
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

/** One sentence the teacher posted to the feed. */
export type Update = {
  id: string;
  text: string;
  /** Epoch milliseconds, so the feed can age the label as time passes. */
  at: number;
  /**
   * Optional photo, held as a data URI. Downscaled and stripped of EXIF before
   * it gets here (see lib/photo.ts) — a classroom photo carries GPS in its
   * metadata, which an anonymous feed cannot pass on.
   */
  photo?: string;
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
   * The account, in two halves that must not be confused.
   *
   * `name` and `email` are the verified half: proof that a real educator is
   * behind this account. They are never shown to anyone and never appear on a
   * post. Verification is the app's floor — everyone in the feed cleared it.
   *
   * Everything under `shown` is the presented half, and it is the teacher's own
   * choice. A handle instead of a name, a grade or not, a district or not. This
   * is the split Threads gets right: the platform knows who you are, the feed
   * shows what you decided to show.
   *
   * It matters more here than on a general-purpose network. A teacher posting
   * "said no to covering another class" is describing an act of insubordination
   * to some principals, and being able to say it under "Ms R · MS Math" rather
   * than a full name is the difference between posting and not. The floor stays
   * the same either way, which is what stops the pseudonym being a loophole:
   * every handle in the feed passed the same check.
   *
   * What is not presented at all: the check-in record. How a teacher rated
   * Tuesday never leaves the device under any name.
   */
  account: {
    name: string;
    email: string;
    shown: {
      /** What appears on posts. Their name, a shortening of it, or a handle. */
      handle: string;
      /** One of JOBS. Not everyone in a school teaches. */
      job: string;
      /** Grade, subject or specialism. Empty means they gave none. */
      role: string;
      /** District. Never the school building — that is not offered at all. */
      district: string;
      /**
       * Years working in schools. The one credential the feed genuinely runs
       * on: a boundary held for nine days reads differently from someone in
       * their first year than from someone in their twenty-second.
       */
      years: number | null;
      showJob: boolean;
      showRole: boolean;
      showDistrict: boolean;
      showYears: boolean;
    };
  } | null;
  educator: { verified: boolean; verifiedAt: number | null };
  /** Author ids this teacher follows. See AUTHORS in data/mock.ts. */
  following: string[];
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
  account: null,
  educator: { verified: false, verifiedAt: null },
  following: [],
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
  /**
   * How many list items this plan allows. The free plan stops at three; Tended+
   * does not stop. Enforced in one place so the paywall cannot drift from what
   * the paywall copy claims.
   */
  listLimit: number;
  /** True when the list is full and the next item needs Tended+. */
  listFull: boolean;
  /** Whole days remaining, 0 when there is no trial. */
  trialDaysLeft: number;
  /** Tags are optional: the feed asks the question with faces and nothing else. */
  saveCheckIn: (score: number, tags?: string[]) => void;
  clearCheckIn: () => void;
  togglePracticeDay: (practiceId: string, date: ISODate) => void;
  addPractice: (label: string) => void;
  removePractice: (practiceId: string) => void;
  /** Edit an item on the list in place, keeping its tick history. */
  renamePractice: (practiceId: string, label: string) => void;
  setContributing: (on: boolean) => void;
  postUpdate: (text: string, photo?: string | null) => void;
  removeUpdate: (id: string) => void;
  toggleReaction: (updateId: string, reactionId: string) => void;
  startTrial: () => void;
  endTrial: () => void;
  /** Finishes onboarding: who they are, how they appear, and the starting list. */
  completeOnboarding: (input: {
    name: string;
    email: string;
    shown: {
      handle: string;
      job: string;
      role: string;
      district: string;
      years: number | null;
      showJob: boolean;
      showRole: boolean;
      showDistrict: boolean;
      showYears: boolean;
    };
    practices: string[];
    zip: string;
  }) => void;
  /** Change how you appear, at any time, without touching what was verified. */
  updateShown: (patch: Partial<NonNullable<Persisted['account']>['shown']>) => void;
  follow: (authorId: string) => void;
  unfollow: (authorId: string) => void;
  /** For an account that verifies from inside the app rather than at sign-up. */
  setVerified: (verified: boolean, email?: string) => void;
  /** Mints one more invite, up to the cap. */
  createInvite: () => void;
  /** Writes the whole plan at once, as the builder produces it. */
  savePlan: (input: { boundaries: string[]; habits: string[]; contacts: Contact[] }) => void;
  /** Quick on/off from the summary card. */
  toggleBoundary: (id: string) => void;
  /**
   * Saves what someone else did onto this teacher's own list. De-duplicates by
   * label, so tapping twice does not put the same line on the list twice.
   */
  saveToList: (label: string) => void;
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
      listLimit: daysLeft > 0 ? Infinity : FREE_LIST_LIMIT,
      listFull: daysLeft <= 0 && data.practices.length >= FREE_LIST_LIMIT,
      saveCheckIn: (score, tags) =>
        update((prev) => {
          const date = todayISO();
          // Tapping a face is the whole check-in, and it must not wipe tags a
          // teacher added earlier in the day from somewhere that collects them.
          const kept = tags ?? prev.entries[date]?.tags ?? [];
          return { ...prev, entries: { ...prev.entries, [date]: { date, score, tags: kept } } };
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
          if (daysLeft <= 0 && prev.practices.length >= FREE_LIST_LIMIT) return prev;
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
      renamePractice: (practiceId, label) =>
        update((prev) => {
          const trimmed = label.trim();
          if (!trimmed) return prev;
          return {
            ...prev,
            // The id is untouched, so practiceDays still points at this row and
            // an edited line keeps everything it was ticked for.
            practices: prev.practices.map((p) =>
              p.id === practiceId ? { ...p, label: trimmed } : p,
            ),
          };
        }),
      setContributing: (on) => update((prev) => ({ ...prev, contributing: on })),
      postUpdate: (text, photo) =>
        update((prev) => {
          const trimmed = text.trim().slice(0, UPDATE_MAX_LENGTH);
          if (!trimmed) return prev;
          const entry: Update = {
            id: `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            text: trimmed,
            at: Date.now(),
            ...(photo ? { photo } : {}),
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
      completeOnboarding: ({ name, email, shown, practices: labels, zip }) =>
        update((prev) => ({
          ...prev,
          onboardedAt: Date.now(),
          zip: zip.trim() || null,
          account: {
            name: name.trim(),
            email: email.trim(),
            shown: {
              ...shown,
              // Falling back to the name means nobody ends up posting as a
              // blank byline because they skipped the field.
              handle: shown.handle.trim() || name.trim(),
              role: shown.role.trim(),
              district: shown.district.trim(),
            },
          },
          educator: { verified: true, verifiedAt: Date.now() },
          practices: labels.map((label, i) => ({
            id: `p${i}${Date.now().toString(36)}`,
            label,
            ...PRACTICE_PALETTE[i % PRACTICE_PALETTE.length],
          })),
          // The chosen practices are new rows; any ticks the seed left behind
          // are keyed to practices that no longer exist.
          practiceDays: {},
        })),
      setVerified: (verified, email) =>
        update((prev) => ({
          ...prev,
          educator: { verified, verifiedAt: verified ? Date.now() : null },
          account:
            verified && email
              ? {
                  name: prev.account?.name ?? '',
                  email,
                  shown: prev.account?.shown ?? {
                    handle: prev.account?.name ?? '',
                    job: '',
                    role: '',
                    district: '',
                    years: null,
                    showJob: true,
                    showRole: false,
                    showDistrict: false,
                    showYears: true,
                  },
                }
              : prev.account,
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
      saveToList: (label) =>
        update((prev) => {
          const trimmed = label.trim();
          if (!trimmed || prev.practices.some((p) => p.label === trimmed)) return prev;
          // The cap is the product. Saving from the feed is the most common way
          // to hit it, so it is enforced here as well as on the typed input.
          if (daysLeft <= 0 && prev.practices.length >= FREE_LIST_LIMIT) return prev;
          return {
            ...prev,
            practices: [
              ...prev.practices,
              {
                id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
                label: trimmed,
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
      updateShown: (patch) =>
        update((prev) =>
          prev.account
            ? { ...prev, account: { ...prev.account, shown: { ...prev.account.shown, ...patch } } }
            : prev,
        ),
      follow: (authorId) =>
        update((prev) =>
          prev.following.includes(authorId)
            ? prev
            : { ...prev, following: [...prev.following, authorId] },
        ),
      unfollow: (authorId) =>
        update((prev) => ({
          ...prev,
          following: prev.following.filter((id) => id !== authorId),
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
