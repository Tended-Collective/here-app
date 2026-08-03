/**
 * The whole app is a view of one small table: one row per day holding a score of
 * 1–5 and the date. The self-care practices are the same shape — a day either has
 * the practice kept or it doesn't.
 *
 * A check-in used to carry tags as well, naming what made the day heavy. They
 * were read in exactly one place — a clause in the weekly insight — and nothing
 * aggregated or charted them, so asking someone at the end of a bad afternoon to
 * categorise it was a poor trade. The score and the date are the whole record.
 *
 * Everything here is the user's own data and never leaves the device. The feed
 * and the comments under it are fixed sample content (see data/mock.ts).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FREE_LIST_LIMIT, TRIAL_DAYS } from './data/mock';
import { normalizeUsername } from './lib/usernames';
import { normalizeZip, stateForZip } from './lib/zip';
import { ISODate, todayISO, weekDates, weekdayIndex, weekStarts } from './lib/dates';

const STORAGE_KEY = 'tended.v1';

export type Entry = {
  date: ISODate;
  /** 1 = Great … 5 = Rough, evenly spread. Index into MOODS is score - 1. */
  score: number;
};

export type Practice = {
  id: string;
  label: string;
  fill: string;
  border: string;
  /**
   * The day it went on the list. Needed because a lifetime count means nothing
   * without a denominator — "34 times" reads as a lot or a little depending
   * entirely on whether it has been three weeks or three terms.
   *
   * Optional because installs from before this field exists have practices
   * without it; `migrate` backfills from the earliest tick.
   */
  startedAt?: ISODate;
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
  // Five weeks back, so the sample list has a plausible history behind it
  // rather than claiming to have started today.
  const started = weekStarts(5)[0];
  return [
    { id: 'lunch', label: 'Eat lunch sitting down', startedAt: started, ...PRACTICE_PALETTE[0] },
    { id: 'leave', label: 'Out of the building by 4', startedAt: started, ...PRACTICE_PALETTE[1] },
    { id: 'outside', label: 'Twenty minutes outside', startedAt: started, ...PRACTICE_PALETTE[2] },
  ];
}

/** A standing rule. Either in force or not — unlike a habit, it is not ticked. */
/**
 * One comment under a post. `mine` because everything the teacher writes is
 * real and stored, while the other side is sample content resolved at render
 * time — the same split messages used, and the same split a backend will
 * replace wholesale.
 */
export type Comment = { id: string; postId: string; text: string; at: number };

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
      /**
       * What they want to be called on a post. Not unique — two people may both
       * be "Ms P", because this is a label, not an identifier.
       */
      displayName: string;
      /**
       * The identifier: one per account, unique across the app, and what a
       * follow points at. Normalized lowercase. See lib/usernames.ts.
       */
      username: string;
      /** One of JOBS. Not everyone in a school teaches. */
      job: string;
      /** One of LEVELS. */
      level: string;
      /**
       * The school's ZIP. Never shown on a post — it is what resolves to the
       * state below, and what "near my school" is computed from. The school's,
       * not their home: a home address is personal data with nothing to do with
       * this product.
       */
      zip: string;
      /**
       * Two-letter state, derived from the ZIP rather than typed, so every
       * byline spells it the same way. It replaced a free-text district, which
       * was one step from naming a building — a job title plus a district
       * narrows a small system to a handful of people.
       */
      state: string;
      /**
       * Years in education. The one credential the feed genuinely runs on, and
       * the only one a teacher states themselves rather than the app deriving
       * it — "left at 4:30 and did the grading at home" reads differently from
       * someone in their first year than from someone twenty-two years in.
       */
      years: number | null;
      showJob: boolean;
      showLevel: boolean;
      showState: boolean;
      showYears: boolean;
    };
  } | null;
  /**
   * One way in: a code that reached an address at a school domain.
   *
   * There used to be a second — an invite code from an existing account — for
   * teachers unwilling to put a wellness app anywhere near a district-monitored
   * inbox. It is gone. It proved a colleague vouched rather than that the
   * holder works in a school, which meant two ticks meaning two different
   * things, a rule about who may vouch, and an upgrade path. One check is
   * simpler to explain and simpler to trust.
   */
  educator: { verified: boolean; verifiedAt: number | null };
  /**
   * When this person accepted the community rules, or null if they never did.
   *
   * App Store guideline 1.2 wants an app carrying user content to have its users
   * agree to terms that state there is no tolerance for objectionable content.
   * The agreement happens at sign-up; this is the evidence it happened, and the
   * date matters because the rules can be revised and a future version will need
   * to know who agreed to which.
   *
   * Deliberately not backfilled for installs from before it existed: a
   * timestamp invented from `onboardedAt` would be a record of consent that was
   * never given.
   */
  agreedToRulesAt: number | null;
  /**
   * Set when the teacher signs out, cleared when they sign back in.
   *
   * Signing out does not erase anything. The record is the point of the app and
   * it lives on this device — wiping it because someone wanted to sign out on a
   * shared phone would be destroying the thing they came for. `deleteAccount()`
   * is the destructive one, and it says so.
   *
   * The account stays on the device behind this flag, which is why signing back
   * in is a check against the address already stored rather than a lookup. With
   * a backend it becomes a real session and this becomes the absence of a token.
   */
  signedOutAt: number | null;
  /** Author ids this teacher follows. See AUTHORS in data/mock.ts. */
  following: string[];
  /** The self-care plan's standing rules. */
  boundaries: Boundary[];
  /** Who to call. Local only, never sent anywhere. */
  contacts: Contact[];
  /**
   * Which posts this teacher has liked. Was `reactions`, which held up to three
   * different reactions per post; there is one now, so a set of ids is enough.
   * The sample feed's own counts live in data/mock.ts; these add to them.
   */
  likes: string[];
  /** Posts passed on to their own followers. */
  reposts: string[];
  /** Comments this teacher wrote, keyed by the post they sit under. */
  comments: Record<string, Comment[]>;
  /**
   * Posts this teacher has reported, and why. Kept locally so a reported post
   * disappears from their feed the instant they report it — waiting for a
   * moderator to agree before hiding it makes the reporter live with the thing
   * they just objected to.
   *
   * The report itself belongs on a server, where someone can act on it. This
   * record is the reporter's own copy.
   */
  reported: Record<string, { reason: string; at: number }>;
  /**
   * Authors this teacher has blocked. Their posts vanish from the feed and any
   * follow is dropped. Unlike a report, this needs nobody's agreement.
   */
  blocked: string[];
};

const EMPTY: Persisted = {
  entries: {},
  practices: [],
  practiceDays: {},
  contributing: true,
  updates: [],
  likes: [],
  reposts: [],
  comments: {},
  plus: { trialStartedAt: null },
  onboardedAt: null,
  account: null,
  educator: { verified: false, verifiedAt: null },
  agreedToRulesAt: null,
  signedOutAt: null,
  following: [],
  boundaries: [],
  contacts: [],
  reported: {},
  blocked: [],
};

/**
 * Brings a stored payload up to the current shape.
 *
 * The only case so far: accounts written before display name and username were
 * separate fields, which held one `handle` doing both jobs. The handle becomes
 * the display name, and the username is left empty rather than guessed — a
 * username has to be unique, and inventing one on the user's behalf would
 * either collide or hand them something they did not choose. The profile
 * prompts for it instead.
 */
function migrate(data: Persisted): Persisted {
  // The invite route is gone. An account that got in on one still has a real
  // person behind it, so the tick stands; only the extra fields are dropped.
  data = {
    ...data,
    educator: { verified: data.educator.verified, verifiedAt: data.educator.verifiedAt },
  };

  // A list item from before `startedAt` existed: date it from its earliest tick,
  // which is the first day we can prove it was on the list. An item never ticked
  // gets today — inventing a start date earlier than any evidence would make the
  // "34× since" line a guess presented as a record.
  if (data.practices.some((p) => !p.startedAt)) {
    data = {
      ...data,
      practices: data.practices.map((p) => {
        if (p.startedAt) return p;
        const ticks = [...(data.practiceDays[p.id] ?? [])].sort();
        return { ...p, startedAt: ticks[0] ?? todayISO() };
      }),
    };
  }

  const account = data.account as (typeof data.account & { shown?: Record<string, unknown> }) | null;
  if (!account?.shown) return data;

  const shown = account.shown as Record<string, unknown>;
  const current =
    typeof shown.displayName === 'string' &&
    typeof shown.username === 'string' &&
    typeof shown.level === 'string' &&
    typeof shown.zip === 'string' &&
    typeof shown.state === 'string';
  if (current) return data;

  return {
    ...data,
    account: {
      ...account,
      shown: {
        displayName:
          typeof shown.displayName === 'string'
            ? shown.displayName
            : typeof shown.handle === 'string'
              ? shown.handle
              : account.name,
        username: typeof shown.username === 'string' ? shown.username : '',
        job: typeof shown.job === 'string' ? shown.job : '',
        // `role` held a free-text grade or subject and has no equivalent — the
        // band replaced it, and guessing "4th grade" into "Elementary" would be
        // putting words in someone's mouth. `district` narrows to `state`,
        // which cannot be derived from it either, so both start empty.
        level: typeof shown.level === 'string' ? shown.level : '',
        // A previously typed state is dropped rather than kept: it may be
        // "D.C." or "washington", and the ZIP it should have come from was
        // never collected. Asking once is better than displaying four
        // spellings of one place.
        zip: typeof shown.zip === 'string' ? shown.zip : '',
        state: typeof shown.zip === 'string' ? (stateForZip(shown.zip) ?? '') : '',
        years: typeof shown.years === 'number' ? shown.years : null,
        showJob: shown.showJob !== false,
        showLevel: shown.showLevel !== false,
        showState: shown.showState !== false,
        showYears: shown.showYears !== false,
      },
    },
  };
}

/**
 * First-run sample data, so a fresh install opens on the record the design shows
 * rather than an empty chart.
 *
 * This is a demo flag and nothing else. It fabricates a week of check-ins and six
 * weeks of habit ticks that the person holding the phone did not make, and
 * presents both as their own record — which is fine for reviewing the design and
 * indefensible in the hands of a real user. **Set it to false before shipping.**
 */
const SEED_FIRST_RUN = true;

function seed(): Persisted {
  const week = weekDates();
  const today = weekdayIndex();

  // A sample week on the even scale: okay, great, rough, worn down, good.
  const days: { score: number }[] = [
    { score: 3 },
    { score: 1 },
    { score: 5 },
    { score: 4 },
    { score: 2 },
  ];
  const entries: Record<ISODate, Entry> = {};
  for (let i = 0; i < days.length && i < today; i++) {
    entries[week[i]] = { date: week[i], score: days[i].score };
  }

  // The prototype's practice grid, clipped to days that have actually happened.
  const kept: boolean[][] = [
    [true, false, true, false, false, false, false],
    [true, true, true, true, false, false, false],
    [false, true, false, false, false, false, false],
  ];

  /**
   * How many days each practice was kept in each of the five weeks before this
   * one, oldest first. Three different shapes on purpose, because the six-week
   * strip is only worth showing if it can say different things:
   *
   *   lunch   — kept, then a week with nothing in it, then kept again. This is
   *             the case the whole model exists for: a week from hell does not
   *             undo two months, and this item still reads as sticking.
   *   leave   — solid throughout. What established looks like.
   *   outside — twice in five weeks. Honestly not sticking, and the strip says
   *             so without calling it a failure.
   */
  const history: number[][] = [
    [3, 4, 2, 0, 3],
    [5, 4, 5, 3, 4],
    [1, 0, 1, 0, 0],
  ];

  const practices = defaultPractices();
  const practiceDays: Record<string, ISODate[]> = {};
  const priorWeeks = weekStarts(6).slice(0, 5);
  practices.forEach((p, pi) => {
    const past = priorWeeks.flatMap((start, wi) =>
      // Spread across the school week rather than the whole seven, so a seeded
      // history does not claim anyone was doing this on Sundays.
      weekDates(new Date(`${start}T12:00:00`)).slice(0, 5).slice(0, history[pi][wi]),
    );
    practiceDays[p.id] = [...past, ...week.filter((_, di) => di <= today && kept[pi][di])];
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
  saveCheckIn: (score: number) => void;
  clearCheckIn: () => void;
  togglePracticeDay: (practiceId: string, date: ISODate) => void;
  addPractice: (label: string) => void;
  removePractice: (practiceId: string) => void;
  /** Edit an item on the list in place, keeping its tick history. */
  renamePractice: (practiceId: string, label: string) => void;
  setContributing: (on: boolean) => void;
  postUpdate: (text: string, photo?: string | null) => void;
  removeUpdate: (id: string) => void;
  toggleLike: (postId: string) => void;
  /** Pass someone else's post on to your own followers. */
  toggleRepost: (postId: string) => void;
  /** Say something under a post. */
  addComment: (postId: string, text: string) => void;
  /** Remove one of your own comments. */
  removeComment: (postId: string, commentId: string) => void;
  startTrial: () => void;
  endTrial: () => void;
  /** Finishes onboarding: who they are, how they appear, and the starting list. */
  completeOnboarding: (input: {
    name: string;
    email: string;
    shown: {
      displayName: string;
      username: string;
      job: string;
      level: string;
      zip: string;
      state: string;
      years: number | null;
      showJob: boolean;
      showLevel: boolean;
      showState: boolean;
      showYears: boolean;
    };
    practices: string[];
    /** True only if they ticked the box; the caller must not default it. */
    agreedToRules: boolean;
  }) => void;
  /** Change how you appear, at any time, without touching what was verified. */
  updateShown: (patch: Partial<NonNullable<Persisted['account']>['shown']>) => void;
  follow: (authorId: string) => void;
  unfollow: (authorId: string) => void;
  /** Hides the post here and, with a backend, queues it for a moderator. */
  reportPost: (updateId: string, reason: string) => void;
  /** Hides everything by this author and drops any follow. */
  blockAuthor: (authorId: string) => void;
  unblockAuthor: (authorId: string) => void;
  /**
   * Erases the account and everything on the device. Required by App Store
   * guideline 5.1.1(v) for any app that lets you create an account, and the
   * right thing regardless: an app holding a record of how your year went must
   * let you end that record.
   */
  deleteAccount: () => void;
  /**
   * Lock the app without erasing anything. The next launch lands on sign-in.
   */
  signOut: () => void;
  /**
   * Unlock it. Returns false if the address is not the one this device holds,
   * which is the only check available without a server — and is honest about
   * that in the UI rather than pretending to have looked anything up.
   */
  signIn: (email: string) => boolean;
  /** For an account that verifies from inside the app rather than at sign-up. */
  setVerified: (email: string) => void;
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

/**
 * A comment can run longer than a post. A post is a single move stated plainly;
 * a comment is usually the explanation of how it went, which needs more room —
 * but not so much that a thread turns into an essay nobody reads.
 */
export const COMMENT_MAX_LENGTH = 280;

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
        if (raw) next = migrate({ ...EMPTY, ...(JSON.parse(raw) as Partial<Persisted>) });
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
      saveCheckIn: (score) =>
        update((prev) => {
          const date = todayISO();
          return { ...prev, entries: { ...prev.entries, [date]: { date, score } } };
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
          return {
            ...prev,
            practices: [...prev.practices, { id, label: trimmed, startedAt: todayISO(), ...tint }],
          };
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
      toggleLike: (postId) =>
        update((prev) => ({
          ...prev,
          likes: prev.likes.includes(postId)
            ? prev.likes.filter((id) => id !== postId)
            : [...prev.likes, postId],
        })),
      toggleRepost: (postId) =>
        update((prev) => ({
          ...prev,
          reposts: prev.reposts.includes(postId)
            ? prev.reposts.filter((id) => id !== postId)
            : [...prev.reposts, postId],
        })),
      addComment: (postId, text) =>
        update((prev) => {
          const trimmed = text.trim();
          if (!trimmed) return prev;
          const entry: Comment = {
            id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            postId,
            text: trimmed.slice(0, COMMENT_MAX_LENGTH),
            at: Date.now(),
          };
          return {
            ...prev,
            comments: { ...prev.comments, [postId]: [...(prev.comments[postId] ?? []), entry] },
          };
        }),
      removeComment: (postId, commentId) =>
        update((prev) => {
          const next = (prev.comments[postId] ?? []).filter((c) => c.id !== commentId);
          const comments = { ...prev.comments };
          if (next.length === 0) delete comments[postId];
          else comments[postId] = next;
          return { ...prev, comments };
        }),
      startTrial: () =>
        update((prev) =>
          // Starting again while one is running would silently extend it.
          trialDaysRemaining(prev.plus.trialStartedAt) > 0
            ? prev
            : { ...prev, plus: { trialStartedAt: Date.now() } },
        ),
      endTrial: () => update((prev) => ({ ...prev, plus: { trialStartedAt: null } })),
      completeOnboarding: ({ name, email, shown, practices: labels, agreedToRules }) =>
        update((prev) => ({
          ...prev,
          onboardedAt: Date.now(),
          educator: { verified: true, verifiedAt: Date.now() },
          // Recorded from what they actually did. Onboarding will not let anyone
          // reach this point without ticking the box, but the flag is passed
          // through rather than assumed so the record cannot drift from the UI.
          agreedToRulesAt: agreedToRules ? Date.now() : null,
          account: {
            name: name.trim(),
            email: email.trim(),
            shown: {
              ...shown,
              // Falling back to the name means nobody ends up posting as a
              // blank byline because they skipped the field.
              displayName: shown.displayName.trim() || name.trim(),
              username: normalizeUsername(shown.username),
              zip: normalizeZip(shown.zip),
              // Derived, never accepted as typed — one ZIP has one spelling of
              // its state, which is the whole reason the field changed.
              state: stateForZip(shown.zip) ?? '',
            },
          },
          // Onboarding no longer asks for habits, so `labels` is normally empty
          // and whatever the first-run sample left stands. When it is not empty
          // the chosen items are new rows, and any ticks the sample left are
          // keyed to practices that no longer exist.
          practices: labels.length
            ? labels.map((label, i) => ({
                id: `p${i}${Date.now().toString(36)}`,
                label,
                startedAt: todayISO(),
                ...PRACTICE_PALETTE[i % PRACTICE_PALETTE.length],
              }))
            : prev.practices,
          practiceDays: labels.length ? {} : prev.practiceDays,
        })),
      signOut: () => update((prev) => ({ ...prev, signedOutAt: Date.now() })),
      signIn: (email) => {
        const held = data.account?.email?.trim().toLowerCase();
        const given = email.trim().toLowerCase();
        // No account on this device yet: nothing to sign in to.
        if (!held) return false;
        if (held !== given) return false;
        update((prev) => ({ ...prev, signedOutAt: null }));
        return true;
      },
      setVerified: (email) =>
        update((prev) => ({
          ...prev,
          educator: { verified: true, verifiedAt: Date.now() },
          account: {
            name: prev.account?.name ?? '',
            email,
            shown: prev.account?.shown ?? {
              displayName: prev.account?.name ?? '',
              username: '',
              job: '',
              level: '',
              zip: '',
              state: '',
              years: null,
              showJob: true,
              showLevel: true,
              showState: true,
              showYears: true,
            },
          },
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
                startedAt: todayISO(),
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
        update((prev) => {
          if (!prev.account) return prev;
          // A username is stored canonically wherever it comes from, so the
          // comparison the server does and the one the app does agree.
          const next = { ...prev.account.shown, ...patch };
          if (patch.username !== undefined) next.username = normalizeUsername(patch.username);
          // The state follows the ZIP wherever the ZIP is set, so the two can
          // never disagree.
          if (patch.zip !== undefined) {
            next.zip = normalizeZip(patch.zip);
            next.state = stateForZip(next.zip) ?? '';
          }
          return { ...prev, account: { ...prev.account, shown: next } };
        }),
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
      reportPost: (updateId, reason) =>
        update((prev) => ({
          ...prev,
          reported: { ...prev.reported, [updateId]: { reason, at: Date.now() } },
        })),
      blockAuthor: (authorId) =>
        update((prev) => ({
          ...prev,
          blocked: prev.blocked.includes(authorId) ? prev.blocked : [...prev.blocked, authorId],
          // Blocking someone you follow and staying subscribed to them would be
          // a contradiction the feed would have to resolve every render.
          following: prev.following.filter((id) => id !== authorId),
        })),
      unblockAuthor: (authorId) =>
        update((prev) => ({ ...prev, blocked: prev.blocked.filter((id) => id !== authorId) })),
      deleteAccount: () => {
        // Removed rather than overwritten: nothing of the old account should be
        // recoverable from the row, and the next launch should be a first
        // launch. The seed is deliberately not re-applied — a fresh install
        // gets sample data, a deletion gets nothing.
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        setData(EMPTY);
      },
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
