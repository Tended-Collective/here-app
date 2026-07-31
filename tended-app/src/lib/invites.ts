/**
 * Invite codes — the way in that never touches a work inbox.
 *
 * A verified teacher hands a colleague a code. No address, no document, no
 * third party, and nothing arrives in a district mailbox: trust travels the way
 * it already does in a staffroom. It also means the app never learns anything
 * about the person being invited, which the email route can only approximate.
 *
 * ─── What it is worth ────────────────────────────────────────────────────────
 *
 * An invite proves a teacher vouched for you, not that you teach. Codes can be
 * passed on, so the cap per teacher is doing real work: it bounds how far a
 * leaked code can spread and keeps the graph traceable back to whoever issued
 * it. Treat that cap as a safety control, not a growth dial.
 *
 * ─── The format ──────────────────────────────────────────────────────────────
 *
 * Seven characters of payload plus a check character, shown as `XXXX-XXXX`.
 * The alphabet drops I, L, O and U — the first three because they are misread
 * as 1 and 0, U because excluding it keeps accidental words out. `normalize`
 * maps the lookalikes back, so a teacher who types O for 0 is not punished for
 * it, and the check character means a typo fails here rather than after a
 * round trip.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // 32 symbols, no I/L/O/U
const PAYLOAD = 7;

/** How many a verified teacher may hand out. A safety bound, not a growth dial. */
export const INVITES_PER_TEACHER = 5;

function checkChar(payload: string): string {
  let sum = 0;
  for (let i = 0; i < payload.length; i++) {
    const value = ALPHABET.indexOf(payload[i]);
    if (value < 0) return '';
    // Position-weighted, so transposing two characters is caught.
    sum += value * (i + 1);
  }
  return ALPHABET[sum % ALPHABET.length];
}

/** Uppercase, strip separators, and forgive the lookalikes the alphabet omits. */
export function normalize(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

/** `XXXX-XXXX`, the form a code is shown and typed in. */
export function format(code: string): string {
  const clean = normalize(code);
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4, 8)}` : clean;
}

export function generateInviteCode(): string {
  let payload = '';
  for (let i = 0; i < PAYLOAD; i++) {
    payload += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return payload + checkChar(payload);
}

/** True when the code is the right shape and its check character agrees. */
export function isWellFormed(input: string): boolean {
  const code = normalize(input);
  if (code.length !== PAYLOAD + 1) return false;
  if ([...code].some((c) => !ALPHABET.includes(c))) return false;
  return checkChar(code.slice(0, PAYLOAD)) === code[PAYLOAD];
}

/** Flip once redemption is checked and burned server-side. */
export const PROVIDER_CONFIGURED = false;

export type RedeemResult =
  | {
      ok: true;
      /**
       * The username of the account that issued this code.
       *
       * Redemption returns it because an invite has to name someone. A tick
       * that stands on "somebody, somewhere, typed a code" is a tick standing
       * on nothing; a tick that stands on "@marisa.okonjo vouched for this
       * account" is a claim with a person behind it, and one that can be
       * withdrawn if it turns out to be wrong.
       */
      vouchedBy: string;
    }
  | { ok: false; reason: 'malformed' | 'used' | 'unknown' | 'failed' };

/** Who the sample codes resolve to while there is no server to ask. */
const SAMPLE_VOUCHER = 'marisa.okonjo';

/**
 * Single-use is the one property that cannot be enforced on the device holding
 * the code — only a server can burn it. Until there is one, a well-formed code
 * is accepted and attributed to a stand-in account.
 */
export async function redeemInvite(input: string): Promise<RedeemResult> {
  if (!isWellFormed(input)) return { ok: false, reason: 'malformed' };

  // Connect here: the server looks the code up, burns it, and answers with the
  // issuing account. A code it does not recognise, or one already spent, comes
  // back 'unknown' or 'used' — both of which this route must refuse, because a
  // reusable invite is an open door with a tick on it.
  if (!PROVIDER_CONFIGURED) return { ok: true, vouchedBy: SAMPLE_VOUCHER };
  return { ok: false, reason: 'failed' };
}
