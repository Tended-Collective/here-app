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
  /**
   * The podcast on Apple Podcasts. Once `PODCAST_SHOW_ID` is set this is
   * derived from it; until then it is a real Apple Podcasts URL that resolves,
   * rather than a guessed ID that would 404.
   */
  podcast: 'https://podcasts.apple.com/us/search?term=Tended%20Collective',
} as const;

/**
 * The show's Apple Podcasts ID — the digits after `id` in its permalink,
 * `https://podcasts.apple.com/us/podcast/<slug>/id1234567890`.
 *
 * Set it and the support tab lists the show's real episodes, pulled from
 * Apple's lookup API at run time (see lib/podcast.ts). Left null, the section
 * falls back to a single button through to the show.
 */
export const PODCAST_SHOW_ID: string | null = '1872481883';

/** Just the latest episode. */
export const PODCAST_EPISODES = 1;

/** The show's page, derived from the ID when there is one. */
export function podcastUrl(showId: string | null = PODCAST_SHOW_ID): string {
  return showId ? `https://podcasts.apple.com/us/podcast/id${showId}` : SITE.podcast;
}

/**
 * Where a post lives on the site. Change `SITE.blog` or a post's `slug` and the
 * app follows — nothing else needs touching when the website is updated.
 */
export const postUrl = (slug: string) => `${SITE.blog}/${slug}`;

/** 6 rows × 8 columns of ZIP tiles. 0 renders as a gap; 1–7 index HEAT_RAMP. */
export const HEAT_CELLS: number[][] = [
  [0, 0, 2, 3, 2, 1, 0, 0],
  [0, 2, 4, 5, 3, 2, 1, 0],
  [1, 3, 6, 6, 5, 3, 2, 1],
  [2, 5, 6, 7, 4, 3, 2, 1],
  [0, 3, 4, 4, 3, 2, 2, 0],
  [0, 0, 2, 3, 2, 1, 0, 0],
];

/**
 * Figures around the map. Still sample content standing in for a backend — the
 * app has no other teachers' data to count.
 *
 * The two sentences that used to sit on the ZIP card are gone: "71% logged a
 * hard day this week" and "most named the same two things you did" read as
 * findings drawn from the data under them, and would have kept reading that way
 * however the week actually went, because nothing computed them.
 */
export const AREA = {
  totalTeachers: '4,182',
  zip: '47404',
  zipTeachers: '128 TEACHERS',
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
 * The emoji is what you see; the label is what a screen reader says, so the
 * button still announces "Holding you" rather than the codepoint's own name.
 */
export const REACTIONS = [
  // Chosen to stay legible at pill size: 🫂 collapses into an unreadable blob
  // once it is small, where a face still reads.
  { id: 'felt', label: 'Good idea', emoji: '❤️' },
  { id: 'holding', label: 'Needed this', emoji: '🤗' },
  { id: 'same', label: 'Doing this too', emoji: '🙋' },
] as const;

export type ReactionId = (typeof REACTIONS)[number]['id'];

export type FeedUpdate = {
  id: string;
  /**
   * One thing a teacher did for themselves, written so another teacher could
   * do the same. This is the whole point of the feed: you should be able to
   * take it, not just recognise it.
   */
  text: string;
  /** Where it belongs in a plan, and therefore what "add to my plan" adds it to. */
  kind: 'boundary' | 'habit';
  /** How long they have held it. Evidence that it is possible, not a score. */
  streak?: string;
  /** Distance and time. */
  meta: string;
  /** Tint, so the feed still reads at a glance. */
  dot: string;
  /** What other people have already sent. The user's own tap adds to these. */
  reactions: Partial<Record<ReactionId, number>>;
};

/**
 * The nearby feed. Every entry is something a teacher actually did for
 * themselves — a boundary they held or a habit they kept — rather than a report
 * of how their day went.
 *
 * The difference matters. A feed of hard days gives you company; a feed of what
 * worked gives you something to try, and every row here can be added straight
 * to your own plan.
 */
export const NEARBY_UPDATES: FeedUpdate[] = [
  {
    id: '1',
    text: 'Left at 4:30 and did the marking at home with the TV on.',
    kind: 'boundary',
    streak: 'HELD 9 DAYS',
    meta: '3 MILES · 40 MIN AGO',
    dot: 'rgba(117,174,129,0.65)',
    reactions: { felt: 14, holding: 3, same: 6 },
  },
  {
    id: '2',
    text: 'Ate lunch in the park instead of at my desk.',
    kind: 'habit',
    streak: 'KEPT 4 DAYS',
    meta: '6 MILES · 2 HR AGO',
    dot: 'rgba(182,172,113,0.65)',
    reactions: { felt: 21, same: 9 },
  },
  {
    id: '3',
    text: 'Said no to covering another duty this week.',
    kind: 'boundary',
    streak: 'FIRST TIME',
    meta: '4 MILES · 3 HR AGO',
    dot: 'rgba(117,174,129,0.65)',
    reactions: { felt: 30, holding: 11, same: 4 },
  },
  {
    id: '4',
    text: 'Phone goes in a drawer at 7pm and stays there.',
    kind: 'boundary',
    streak: 'HELD 12 DAYS',
    meta: '9 MILES · 5 HR AGO',
    dot: 'rgba(122,173,132,0.6)',
    reactions: { felt: 17, holding: 2, same: 12 },
  },
];

/**
 * How much of the feed the free tier sees. Reacting stays free at any tier —
 * encouraging someone who did the hard thing is not something to charge for —
 * but posting and the rest of the feed are part of Tended+.
 */
export const FREE_FEED_VIEWS = 3;

/** Behind "See the last hour" — older than the four above, same shape. */
export const LAST_HOUR_UPDATES: FeedUpdate[] = [
  {
    id: '5',
    text: 'Walked the long way to the car. Fifteen minutes, no phone.',
    kind: 'habit',
    streak: 'KEPT 6 DAYS',
    meta: '12 MILES · 6 HR AGO',
    dot: 'rgba(182,172,113,0.65)',
    reactions: { felt: 12, same: 7 },
  },
  {
    id: '6',
    text: 'Booked the therapy appointment I had been putting off since March.',
    kind: 'habit',
    meta: '2 MILES · 7 HR AGO',
    dot: 'rgba(117,174,129,0.65)',
    reactions: { felt: 41, holding: 9, same: 3 },
  },
  {
    id: '7',
    text: 'No school work before noon on Sundays.',
    kind: 'boundary',
    streak: 'HELD 3 WEEKS',
    meta: '7 MILES · 8 HR AGO',
    dot: 'rgba(122,173,132,0.6)',
    reactions: { felt: 9, holding: 4, same: 15 },
  },
];

/**
 * The reading list. Every card opens its post on tendedcollective.com.
 *
 * The slugs below are placeholders in the shape the real ones will take — swap
 * each for the published post's slug and the card points at the real article.
 */
export const POSTS = [
  {
    id: '1',
    kicker: 'HELD STORIES · 6 MIN',
    title: 'The year I stopped answering emails after six',
    slug: 'the-year-i-stopped-answering-emails-after-six',
  },
];

/**
 * Tended Collective's own shelf. Always the first row of the support section
 * and never part of the inventory, so there is one place in there that is
 * editorial rather than bought.
 */
export const RESOURCE_LINK = {
  title: 'Tended Collective · free therapy resources',
  sub: 'Free and low-cost therapy options for teachers',
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
    // Written from what the service actually does. Their own tagline is
    // trademarked wording that could not be checked from where this was built —
    // drop the real one in here when you have it.
    title: 'Find a therapist who takes your insurance',
    sub: 'Book in days, not months · evenings and weekends',
    href: 'https://growtherapy.com',
  },
  {
    id: 'happy-coffee',
    advertiser: 'The Happy Coffee Company',
    title: 'Free coffee for teachers, every Friday',
    sub: 'Show your school badge in store · all locations',
    href: 'https://www.thehappycoffeecompany.com',
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

/**
 * Offered during onboarding. The first three are the design's own practices, so
 * a teacher who taps straight through lands on the tracker the mockup showed.
 * All of them are small, same-day and answerable yes or no — a practice you
 * cannot tick by four o'clock is a resolution, and this is not that.
 */
export const PRACTICE_SUGGESTIONS = [
  'Eat lunch sitting down',
  'Out of the building by 4',
  'Twenty minutes outside',
  'No email after six',
  'One thing that went right',
  'Asleep before eleven',
  'A proper break at break',
  'Say no to one thing',
];

/**
 * Offered in step 1 of the plan builder. Boundaries differ from habits: a habit
 * is ticked off on a given day, a boundary is a standing rule that is either in
 * force or not. Each one is a decision someone else can be told about.
 */
export const BOUNDARY_SUGGESTIONS = [
  'No work email after 6pm',
  'Leave the building by 4:30',
  'No grading on Sundays',
  'Lunch away from my desk',
  'Phone off after 9pm',
  'One weekday evening off',
  'No school work in the bedroom',
  'Decline meetings without an agenda',
];

/** What the paywall says you get. The first three are what the design promised. */
export const PLUS_BENEFITS = [
  'Month and term views, not just the last seven days',
  'Compare this year against last',
  'See which tags drive your hardest days',
  'Export your full record as a file',
];

/** Six-week trend line behind the Tended+ lock, in a 300×90 viewBox. */
export const LOCKED_TREND =
  '6,66 32,58 58,70 84,48 110,54 136,38 162,44 188,28 214,34 240,20 266,26 288,18';
