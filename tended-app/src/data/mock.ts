/**
 * Fixed sample content. None of this is the user's own data — it stands in for
 * what a backend would return for the area view and the reading list.
 */

/**
 * Tended Collective on the web. The reading list and the resource list are the
 * two places the app hands the teacher off to it.
 *
 * Per-post slugs would replace the shared `url` on each POSTS entry; until the
 * posts are real, all three point at the blog index.
 */
export const SITE = {
  home: 'https://www.tendedcollective.com',
  freeTherapyResources: 'https://www.tendedcollective.com/free-therapy-resources',
  blog: 'https://www.tendedcollective.com/blog',
} as const;

/** 6 rows × 8 columns of ZIP tiles. 0 renders as a gap; 1–7 index HEAT_RAMP. */
export const HEAT_CELLS: number[][] = [
  [0, 0, 2, 3, 2, 1, 0, 0],
  [0, 2, 4, 5, 3, 2, 1, 0],
  [1, 3, 6, 6, 5, 3, 2, 1],
  [2, 5, 6, 7, 4, 3, 2, 1],
  [0, 3, 4, 4, 3, 2, 2, 0],
  [0, 0, 2, 3, 2, 1, 0, 0],
];

export const AREA = {
  totalTeachers: '4,182',
  zip: '47404',
  zipTeachers: '128 TEACHERS',
  headline: '71% logged a hard day this week.',
  body: 'Most named the same two things you did. Report-card week lands the same way across every ZIP on your calendar.',
};

/** What people named here — share of check-ins, and the ramp colour it maps to. */
export const NAMED_CAUSES = [
  { label: 'Workload', share: 0.88, color: 'rgba(180,103,98,0.6)' },
  { label: 'No break in the day', share: 0.71, color: 'rgba(207,139,116,0.6)' },
  { label: 'Behaviour support', share: 0.54, color: 'rgba(214,177,125,0.7)' },
  { label: 'Admin asks', share: 0.41, color: 'rgba(182,172,113,0.7)' },
];

/**
 * The three ways to answer someone else's update. Reactions are the only
 * response the feed allows: there are no replies and no free-text answers, so a
 * hard day can be met without the feed turning into a thread to argue in.
 *
 * They are words rather than emoji because the app has no emoji anywhere else.
 */
export const REACTIONS = [
  { id: 'felt', label: 'Felt that' },
  { id: 'holding', label: 'Holding you' },
  { id: 'same', label: 'Same here' },
] as const;

export type ReactionId = (typeof REACTIONS)[number]['id'];

export type FeedUpdate = {
  id: string;
  /** One sentence, written by a teacher within 15 miles. Never a name. */
  text: string;
  /** Distance and time. */
  meta: string;
  /** Mood tint, so the feed still reads at a glance. */
  dot: string;
  /** What other people have already sent. The user's own tap adds to these. */
  reactions: Partial<Record<ReactionId, number>>;
};

/**
 * The live nearby feed: one sentence from a teacher within 15 miles, and what
 * other people sent back. No names and no replies.
 */
export const NEARBY_UPDATES: FeedUpdate[] = [
  {
    id: '1',
    text: 'Third fire drill this week, right in the middle of the only lesson I was proud of.',
    meta: '3 MILES · 2 MIN AGO',
    dot: 'rgba(209,136,130,0.65)',
    reactions: { felt: 14, holding: 3, same: 6 },
  },
  {
    id: '2',
    text: 'I ate lunch sitting down today and it genuinely fixed something.',
    meta: '6 MILES · 11 MIN AGO',
    dot: 'rgba(117,174,129,0.65)',
    reactions: { felt: 21, same: 9 },
  },
  {
    id: '3',
    text: 'Second week of covering someone else’s class on my only free period.',
    meta: '4 MILES · 24 MIN AGO',
    dot: 'rgba(207,139,116,0.65)',
    reactions: { felt: 8, holding: 11, same: 12 },
  },
  {
    id: '4',
    text: 'A parent emailed at 11pm and I did not answer it, and I am counting that as a win.',
    meta: '9 MILES · 38 MIN AGO',
    dot: 'rgba(191,150,93,0.65)',
    reactions: { felt: 17, holding: 2, same: 4 },
  },
];

/** Behind "See the last hour" — older than the four above, same shape. */
export const LAST_HOUR_UPDATES: FeedUpdate[] = [
  {
    id: '5',
    text: 'Report cards are done and I have forgotten what I used to do in the evenings.',
    meta: '12 MILES · 44 MIN AGO',
    dot: 'rgba(207,139,116,0.65)',
    reactions: { felt: 12, same: 7 },
  },
  {
    id: '6',
    text: 'One of mine read a whole page out loud today without stopping.',
    meta: '2 MILES · 51 MIN AGO',
    dot: 'rgba(117,174,129,0.65)',
    reactions: { felt: 30, holding: 1, same: 3 },
  },
  {
    id: '7',
    text: 'Told my head of year I could not take another duty and she just said okay.',
    meta: '7 MILES · 58 MIN AGO',
    dot: 'rgba(182,172,113,0.65)',
    reactions: { felt: 9, holding: 4, same: 5 },
  },
];

/**
 * The reading list. Every card hands off to Tended Collective on the web —
 * `url` is per-post so real slugs can replace the shared blog link.
 */
export const POSTS = [
  {
    id: '1',
    kicker: 'HELD STORIES · 6 MIN',
    title: 'The year I stopped answering emails after six',
    url: SITE.blog,
  },
  {
    id: '2',
    kicker: 'THE SAFETY · 11 MIN AUDIO',
    title: 'Guided audio for the drive home',
    url: SITE.blog,
  },
  {
    id: '3',
    kicker: 'PRACTICAL · 4 MIN',
    title: 'How to ask for a mental-health day',
    url: SITE.blog,
  },
];

/**
 * The crisis block. Deliberately separate from the sponsored shelf below and
 * never sold: someone reaching for 988 should not have to work out which row
 * on the screen was paid for.
 *
 * A line with an `href` opens it; one without is there to be read — the EAP is
 * your district's, so the app has no address for it and doesn't pretend to.
 */
export const CRISIS_LINES: { id: string; title: string; sub: string; href?: string }[] = [
  {
    id: '988',
    title: '988 · Suicide & Crisis Lifeline',
    sub: 'Call or text, 24/7',
    href: 'tel:988',
  },
  { id: 'eap', title: 'Your EAP · 6 free sessions', sub: 'No referral needed' },
];

/**
 * Tended Collective's own shelf. Always the first row of the support section
 * and never part of the inventory, so there is one place in there that is
 * editorial rather than bought.
 */
export const RESOURCE_LINK = {
  title: 'Tended Collective · free therapy resources',
  sub: 'Low-cost and free options, gathered for teachers',
  href: SITE.freeTherapyResources,
};

export type Sponsor = {
  id: string;
  /** Named on the card — a placement is only honest if you can see whose it is. */
  advertiser: string;
  title: string;
  sub: string;
  href: string;
};

/** How many placements the section holds. Unsold ones show as available. */
export const AD_SLOTS = 3;

/**
 * Sold placements, in order. Every one renders under a SPONSORED label:
 * a paid recommendation sitting in a mental-health app has to say so, and in
 * the US the FTC requires the disclosure to be clear and conspicuous.
 */
export const SPONSORS: Sponsor[] = [
  {
    id: 'grow',
    advertiser: 'Grow Therapy',
    title: 'Therapists who take your plan',
    sub: 'Evenings and weekends · most major insurance',
    href: 'https://growtherapy.com',
  },
];

/**
 * Draw the unsold slots as visible inventory. Useful while the space is being
 * sold; set false to ship, where an empty slot should simply collapse rather
 * than advertise that nobody bought it.
 */
export const SHOW_UNSOLD_SLOTS = true;

export const PRICING = {
  price: '$4.99',
  cadence: 'a month · or $39 a year',
  cta: 'Try 30 days free',
};

/** Length of the free trial, in days. Matches PRICING.cta. */
export const TRIAL_DAYS = 30;

/** What the paywall says you get. The first three are what the design promised. */
export const PLUS_BENEFITS = [
  'Month and term views, not just the last seven days',
  'This October against last October',
  'The patterns behind your heavy days',
  'An export you can hand a therapist',
];

/** Six-week trend line behind the Tended+ lock, in a 300×90 viewBox. */
export const LOCKED_TREND =
  '6,66 32,58 58,70 84,48 110,54 136,38 162,44 188,28 214,34 240,20 266,26 288,18';
