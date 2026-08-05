/**
 * Usernames: one per account, unique across the app.
 *
 * The feed has two names on it and they do different jobs. A display name is
 * whatever the person wants to be called — "Ms P", "Dana W.", their full name —
 * and two people may pick the same one, which is fine because it is a label.
 * A username is the identifier: it is how you are followed, how someone finds
 * you again after seeing one good post, and how a reader knows that "Ms P" this
 * week is the same "Ms P" who posted last week.
 *
 * That last part is the reason uniqueness matters here specifically. What a
 * post is worth depends on who wrote it — their job, their years in schools,
 * and whether the things they have posted before turned out to be worth
 * copying — and none of that attaches to anyone unless one name means one
 * person. Two accounts sharing a name is also exactly the shape an impersonator
 * would use: copy the display name of someone people follow and inherit their
 * credibility.
 *
 * Enforcement is ultimately the server's: a UNIQUE index on a normalized column
 * is the only thing that can actually prevent a collision, because two people
 * can pass this check on separate devices in the same second. What runs here is
 * the fast feedback loop — invalid shapes and known collisions caught while
 * they type, so the failure at submit is rare rather than routine.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/**
 * False until a backend can answer "is this taken?". While it is false the
 * check runs against the sample directory only, which is enough to demonstrate
 * the flow but proves nothing about the real namespace.
 */
export const PROVIDER_CONFIGURED = false;

/**
 * Names that cannot be claimed. Two groups: ones that would let an account
 * pass as the app itself, and ones that would let it pass as a school official.
 * An account called "heresupport" or "principal" is a phishing surface before it
 * is anything else.
 *
 * The old name is still held. Tended Collective owns the domain the app links
 * to and the podcast it points at, so "tended" is exactly as impersonable after
 * the rename as it was before — releasing it would hand someone the previous
 * name of the app they are reading.
 */
const RESERVED = new Set([
  'here', 'hereapp', 'herecollective',
  'tended', 'tendedapp', 'tendedcollective', 'support', 'help', 'admin', 'administrator',
  'moderator', 'mod', 'staff', 'team', 'official', 'security', 'billing', 'privacy',
  'principal', 'superintendent', 'hr', 'district', 'everyone', 'me', 'you', 'null',
  'undefined', 'root', 'system', 'about', 'settings', 'login', 'signup',
]);

/**
 * The canonical form. Comparison and storage both use this, so `Ms.P`, `ms.p`
 * and `@MS.P` are one username rather than three — a namespace where they
 * differ only by case is a namespace built for impersonation.
 */
export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '');
}

export type UsernameProblem =
  | 'too-short'
  | 'too-long'
  | 'bad-characters'
  | 'bad-edges'
  | 'doubled-separator'
  | 'reserved';

export type Validity = { ok: true } | { ok: false; reason: UsernameProblem };

/** Shape only. Says nothing about whether anyone else has it. */
export function validateUsername(raw: string): Validity {
  const name = normalizeUsername(raw);
  const typed = raw.trim().replace(/^@+/, '');

  if (name.length < USERNAME_MIN) return { ok: false, reason: 'too-short' };
  if (name.length > USERNAME_MAX) return { ok: false, reason: 'too-long' };
  // Compared against the typed string so that stripped characters are reported
  // as rejected rather than silently disappearing under the cursor.
  if (typed.toLowerCase() !== name) return { ok: false, reason: 'bad-characters' };
  if (/^[._]|[._]$/.test(name)) return { ok: false, reason: 'bad-edges' };
  if (/[._]{2,}/.test(name)) return { ok: false, reason: 'doubled-separator' };
  if (RESERVED.has(name)) return { ok: false, reason: 'reserved' };
  return { ok: true };
}

export function problemMessage(reason: UsernameProblem): string {
  switch (reason) {
    case 'too-short':
      return `At least ${USERNAME_MIN} characters.`;
    case 'too-long':
      return `At most ${USERNAME_MAX} characters.`;
    case 'bad-characters':
      return 'Letters, numbers, dots and underscores only.';
    case 'bad-edges':
      return 'Cannot start or end with a dot or underscore.';
    case 'doubled-separator':
      return 'No two dots or underscores in a row.';
    case 'reserved':
      return 'That one is reserved.';
  }
}

export type Availability = 'available' | 'taken';

/**
 * Is it free? Async because the real answer comes from a server; the local
 * branch answers from whatever directory it is given.
 */
export async function checkUsername(raw: string, taken: Iterable<string>): Promise<Availability> {
  const name = normalizeUsername(raw);

  if (!PROVIDER_CONFIGURED) {
    const claimed = new Set([...taken].map(normalizeUsername));
    // A beat of latency, so the UI is built against the states it will really
    // have to render rather than against an answer that arrives instantly.
    await new Promise((resolve) => setTimeout(resolve, 220));
    return claimed.has(name) ? 'taken' : 'available';
  }

  // Connect here: ask the server, which holds the UNIQUE index that actually
  // decides. This answer is advisory even then — the claim at submit is what
  // settles it, and it can still lose a race.
  return 'available';
}

/** Three near misses when the one they wanted is gone. */
export function suggestUsernames(raw: string, taken: Iterable<string>): string[] {
  const base = normalizeUsername(raw).slice(0, USERNAME_MAX - 3) || 'teacher';
  const claimed = new Set([...taken].map(normalizeUsername));
  const candidates = [
    `${base}_`.replace(/_$/, '') + '.edu',
    `${base}${new Date().getFullYear() % 100}`,
    `ms.${base}`,
    `mr.${base}`,
    `${base}_1`,
    `the.${base}`,
  ];
  return candidates
    .map((c) => c.slice(0, USERNAME_MAX))
    .filter((c) => validateUsername(c).ok && !claimed.has(c))
    .slice(0, 3);
}
