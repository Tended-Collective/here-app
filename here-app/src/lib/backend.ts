/**
 * The connection to Supabase, and the switch that decides whether there is one.
 *
 * ─── Off by default, on purpose ──────────────────────────────────────────────
 *
 * `BACKEND_CONFIGURED` is false unless both environment variables below are set
 * at build time. Nothing here reaches the network until they are, and every
 * caller keeps the device-only behaviour it had before. That means this can be
 * merged, shipped and left alone: the build in TestFlight today behaves exactly
 * as it did, and turning the server on is a matter of setting two values and
 * making a new build, not of merging a branch.
 *
 * It also means the flag is the honest answer to "is this wired up yet". There
 * is no half state where some screens talk to a server and others do not
 * because someone forgot.
 *
 * ─── Why the anon key is safe to ship, and what makes it safe ────────────────
 *
 * `EXPO_PUBLIC_` variables are inlined into the JavaScript bundle, so the anon
 * key is inside the iOS binary and anybody can pull it out. That is how
 * Supabase is designed to work: the key identifies the project, it does not
 * grant anything. What grants things is Row Level Security, and every table in
 * supabase/schema.sql has it turned on.
 *
 * The consequence to keep in mind whenever a query is written: assume the
 * attacker already has this key and is talking to the database directly with
 * curl. If a policy does not stop them, nothing in this app will.
 *
 * The *service* key is a different object entirely and must never appear in
 * this file, in this repo, or in any build. It bypasses RLS. It belongs in the
 * Supabase dashboard, where the moderation queue is read.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

/**
 * The key that identifies this project to Supabase.
 *
 * Two names because Supabase renamed the thing. The dashboard used to offer an
 * `anon` key — a JWT — and now offers a **publishable key** starting
 * `sb_publishable_`. They go in the same slot and the client accepts either;
 * only the label changed.
 *
 * Both variable names are read so that a build does not silently lose its
 * backend the day somebody updates the name to match the dashboard. That
 * failure would be quiet in the worst way: the app would fall back to
 * device-only, and `app.config.js` would file an App Store privacy declaration
 * saying it collects nothing — while the previous build, still installed on
 * people's phones, was collecting.
 *
 * `EXPO_PUBLIC_SUPABASE_ANON_KEY` is the one docs/backend.md tells you to set.
 */
const ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  '';

/**
 * True when this build has a server behind it.
 *
 * Both values are required. A URL with no key, or a key with no URL, is a
 * half-configured build that would fail on the first request — better to run as
 * the device-only app than to fail at the sign-up screen.
 */
export const BACKEND_CONFIGURED = URL.length > 0 && ANON_KEY.length > 0;

/**
 * The client, or null when this build has no server.
 *
 * Null rather than a stub that throws: callers have to handle the local case
 * anyway, and a null check is a thing TypeScript enforces at the call site
 * whereas a stub only fails at run time, on a phone, in front of a teacher.
 */
export const supabase: SupabaseClient | null = BACKEND_CONFIGURED
  ? createClient(URL, ANON_KEY, {
      auth: {
        /**
         * Sessions live in the same AsyncStorage this app already uses, under
         * Supabase's own key — it does not touch `tended.v1`, so signing out of
         * the server cannot take the check-in record with it.
         */
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        /**
         * There is no URL to detect a session in. This defaults to true for the
         * web, where it would try to read a session out of the address bar on
         * every load; on a phone there is no address bar, and in the web
         * preview build there is nothing to find.
         */
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * A public URL for a photo, from the path stored on the post.
 *
 * The bucket is public-read, so this is string assembly rather than a request —
 * which matters in a feed, where doing it per row would otherwise be one signed
 * URL round trip per image.
 */
export function photoUrl(path: string | null | undefined): string | null {
  if (!path || !supabase) return null;
  return supabase.storage.from('post-photos').getPublicUrl(path).data.publicUrl;
}
