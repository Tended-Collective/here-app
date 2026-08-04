/**
 * The community rules, and the no-tolerance statement Apple requires.
 *
 * ─── Why this exists in the app and not only on the website ──────────────────
 *
 * App Store guideline 1.2 asks an app carrying user content to do four things:
 * filter objectionable material, let people report it, let people block an
 * abusive account, and publish contact details. It also asks that users *agree*
 * to terms which state plainly that there is no tolerance for objectionable
 * content or abusive users. Reporting, blocking and contact are built. This file
 * is the agreement, and it lives in the bundle so it can be read on a phone with
 * no signal, and so it cannot quietly drift from what the app actually enforces.
 *
 * ─── Why these rules and not a generic set ───────────────────────────────────
 *
 * Two of them do not appear on a general-purpose network, and they are the two
 * that matter most here.
 *
 * A post naming a child is the failure mode this app is most exposed to: the
 * whole feed is school staff describing their working day, and the line between
 * "I had a hard afternoon" and a story about an identifiable eleven-year-old is
 * one sentence wide. Nobody crosses it maliciously. It still has to be a rule,
 * and it still has to be the first one.
 *
 * The other is naming a colleague or a school. A teacher describing their
 * principal by name on a feed their principal can join is a disciplinary matter
 * waiting to happen, and the person it hurts is usually the one who posted.
 *
 * The rest is the ordinary floor.
 *
 * ─── The tone ───────────────────────────────────────────────────────────────
 *
 * Written as things not to do, not as threats. The audience is people who came
 * here to say they ate lunch outside; a wall of legal menace at sign-up is both
 * unpleasant and a bad predictor of behaviour. The enforcement sentence is
 * unambiguous, which is the part Apple is actually reading, and it sits at the
 * end rather than the top.
 */

export type Rule = { title: string; body: string };

export const COMMUNITY_RULES: Rule[] = [
  {
    title: 'Never name a student',
    body: 'No names, no initials, no photographs, no detail that would let someone work out which child you mean. This is the one rule with no grey area, and it applies even when what you are saying is kind.',
  },
  {
    title: 'Do not name colleagues or your school',
    body: 'Write about what happened to you, not about who did it. Naming a colleague, a principal or a building turns your post into something that can be used against you, and against them.',
  },
  {
    title: 'No harassment, hate or abuse',
    body: 'Nothing targeting anyone for their race, religion, disability, gender, sexuality or anything else about who they are. This applies in comments as much as in posts — a reply under someone else’s post is not a lesser space.',
  },
  {
    title: 'Do not sell things here',
    body: 'No advertising, no recruiting, no affiliate links, no promoting your own paid resources. Anything paid on Here is labelled as a placement and never posted as though it came from a teacher.',
  },
  {
    title: 'Be who you said you were',
    body: 'One account per person, and the job and years you show should be true. You can be as anonymous as you like — a handle and nothing else is fine — but do not claim to work in a school if you do not.',
  },
  {
    title: 'Take care with a hard day',
    body: 'You can say a day was rough. Do not post graphic detail about self-harm or suicide. If you are in danger, please contact your local emergency services rather than posting — this app has nobody watching in real time.',
  },
];

/**
 * The sentence guideline 1.2 exists for. Deliberately unhedged: no "may", no
 * "at our discretion", nothing that reads as a policy we might not apply.
 */
export const NO_TOLERANCE =
  'There is no tolerance for objectionable content or abusive behaviour on Here. Reported posts are removed from your feed immediately and reviewed within 24 hours. Accounts that break these rules are removed, and serious breaches are removed without warning.';

/**
 * Published contact, which is itself one of the four things 1.2 asks for.
 *
 * One address for everything. Two constants rather than one because the app
 * says different things next to each — "contact us" in Settings, "report
 * something urgent" in the rules — and because the day this splits into a
 * support queue and a safety queue, it splits here and nowhere else.
 */
export const SUPPORT_EMAIL = 'hello@tendedcollective.com';

/** Where to report something urgent that cannot wait for the in-app flow. */
export const SAFETY_EMAIL = SUPPORT_EMAIL;
