/**
 * Proving someone teaches, without learning who they are.
 *
 * ─── The rule ────────────────────────────────────────────────────────────────
 *
 * Verification is an event, not a record. A code goes to a school address, the
 * teacher types it back, and then the address is gone: what persists is
 * `verified: true` and a timestamp. Not the address, and deliberately not even
 * the domain — `lincolnhigh.k12.in.us` names a building, and a building plus a
 * daily mood is most of the way to naming a person.
 *
 * ─── What this does and does not prove ───────────────────────────────────────
 *
 * It proves control of an address at a school domain. It does not prove someone
 * currently teaches, and a determined person with any .edu address can pass it.
 * That is the right level: the point is to keep the feed among teachers, not to
 * withstand an adversary. Weigh anything stronger — payslips, ID, a third-party
 * check — against the fact that each one puts identity somewhere.
 *
 * ─── The correlation this cannot fix ─────────────────────────────────────────
 *
 * One server seeing "address X verified at 14:02" and "device D issued a token
 * at 14:02" can link them by timing, however little is stored. Breaking that
 * properly needs blind signatures, or a separate verifier that returns only
 * yes/no. Worth doing if verification ever becomes load-bearing; noted here so
 * the limitation is chosen rather than overlooked.
 *
 * ─── What is wired now ───────────────────────────────────────────────────────
 *
 * `PROVIDER_CONFIGURED` is false: no mail is sent and any well-formed code is
 * accepted. The domain check below is real and runs on device.
 */

/**
 * ─── What the email must look like ───────────────────────────────────────────
 *
 * The one risk this flow cannot design away sits on the district's side, not
 * ours: their mail server sees that a code arrived, whatever we do or don't
 * store. We can only keep that trace uninformative, so whatever sends the code
 * must obey these — the UI beside this promises them:
 *
 *   Subject   "Your Here code is 123456"
 *   Body      the code, an expiry, and nothing else
 *   Sender    the product name only
 *
 * No mention of wellness, burnout, mental health, therapy or check-ins, in any
 * header or body. Not to deceive an employer — the teacher is the one being
 * protected — but because a subject line is the part of this a district reads.
 */

/** Flip once a real code-sending backend is behind `requestCode`. */
export const PROVIDER_CONFIGURED = false;

export const CODE_LENGTH = 6;

/**
 * ─── Why this does not try to list school domains ────────────────────────────
 *
 * It cannot be done. DC's district is `k12.dc.gov`, Los Angeles Unified is
 * `lausd.net`, Houston ISD is `houstonisd.org`. Any allowlist of shapes rejects
 * real teachers, and rejecting a teacher at the door is a worse failure than
 * letting a non-teacher reach a code they will never receive.
 *
 * So the gate is inverted: block mail providers that are definitely not a
 * school, let everything else through, and let the code itself do the proving.
 * Only an address that receives the mail can pass, whatever its domain.
 */
const CONSUMER_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
]);

/**
 * Shapes we recognise as a school. Used only to decide whether to reassure the
 * teacher or warn them — never to refuse. A domain missing from this list is
 * accepted just the same.
 */
const EDUCATOR_PATTERNS: RegExp[] = [
  /\.edu$/i, //                            US higher ed and many districts
  /(^|\.)k12\.[a-z]{2}\.(us|gov)$/i, //    lincoln.k12.in.us, k12.dc.gov
  /\.edu\.[a-z]{2}$/i, //                  .edu.au, .edu.mx …
  /\.ac\.[a-z]{2}$/i, //                   .ac.uk, .ac.nz …
  /\.sch\.[a-z]{2}$/i, //                  .sch.uk …
  /\.school$/i,
  /\.college$/i,
  /\.academy$/i,
];

export function isConsumerDomain(email: string): boolean {
  const domain = domainOf(email);
  return domain ? CONSUMER_DOMAINS.has(domain) : false;
}

export function domainOf(email: string): string | null {
  const at = email.trim().toLowerCase().lastIndexOf('@');
  if (at < 1 || at === email.trim().length - 1) return null;
  return email.trim().toLowerCase().slice(at + 1);
}

/** A shape check only — `a@b.edu` passes, nothing here contacts anyone. */
export function isPlausibleEmail(email: string): boolean {
  const domain = domainOf(email);
  return Boolean(domain && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email.trim()));
}

export function looksLikeEducatorDomain(email: string): boolean {
  const domain = domainOf(email);
  if (!domain) return false;
  return EDUCATOR_PATTERNS.some((pattern) => pattern.test(domain));
}

export type RequestResult =
  | { ok: true; sent: boolean }
  | { ok: false; reason: 'invalid-email' | 'consumer-domain' | 'failed' };

export async function requestCode(email: string): Promise<RequestResult> {
  if (!isPlausibleEmail(email)) return { ok: false, reason: 'invalid-email' };
  // The only refusal: mail that is definitely personal, not work.
  if (isConsumerDomain(email)) return { ok: false, reason: 'consumer-domain' };

  if (!PROVIDER_CONFIGURED) return { ok: true, sent: false };

  // Connect here: post the address to an endpoint that mails a code and holds
  // it only until it is used or expires. The address must not be written to the
  // app's own storage on the way past.
  return { ok: false, reason: 'failed' };
}

export type SubmitResult = { ok: true } | { ok: false; reason: 'bad-code' | 'failed' };

export async function submitCode(code: string): Promise<SubmitResult> {
  const digits = code.replace(/\D/g, '');
  if (digits.length !== CODE_LENGTH) return { ok: false, reason: 'bad-code' };

  if (!PROVIDER_CONFIGURED) return { ok: true };

  return { ok: false, reason: 'failed' };
}
