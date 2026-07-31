/**
 * Fixed sample content. None of this is the user's own data — it stands in for
 * what a backend would return for the feed and the reading list.
 *
 * The ZIP heat map's data used to live here: a grid of tiles shaded by how
 * teachers in each ZIP rated their week, plus the causes they named. It is
 * gone. Knowing that the building down the road is also having a rough week is
 * not something a teacher can act on, and a map of where morale is worst is a
 * dangerous object to have built once anyone thinks to ask who is in those
 * tiles. What replaced it is a feed of things that worked, with names on them.
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

/**
 * The three ways to answer someone else's update. Reactions are the only
 * response the feed allows in public: there are no replies and no free-text
 * answers under a post, so a hard day can be met without the feed turning into a
 * thread to argue in. Anything longer than a reaction goes to messages, where it
 * is between two people.
 *
 * `icon` is what you see, drawn as a line glyph rather than an emoji so the three
 * sit at one stroke weight and one size (see components/Icon.tsx). `label` is
 * what a screen reader says, so the button announces "Needed this" rather than
 * describing a shape.
 */
export const REACTIONS = [
  { id: 'felt', label: 'Good idea', icon: 'heart' },
  { id: 'holding', label: 'Needed this', icon: 'hug' },
  { id: 'same', label: 'Doing this too', icon: 'hand' },
] as const;

export type ReactionId = (typeof REACTIONS)[number]['id'];

/**
 * Who posted — as they chose to appear, not as they verified.
 *
 * Everyone here cleared the same school-email check. What differs is how much
 * of themselves they decided to put on a post: a full name with job, level and
 * state, or a handle with a job and nothing else.
 *
 * That range is not decoration. Someone posting "said no to covering another
 * class" is describing insubordination to some principals, and the option to
 * say it as "Ms P · Social Worker" is the difference between posting and
 * staying quiet. The floor underneath every one is identical, which is what
 * keeps the pseudonym from being a way in for someone who does not work in a
 * school.
 */

/**
 * Everyone who works in a school, not only the people who teach. The ones who
 * do not teach are often the ones with the most useful answers about surviving
 * the building — a counselor knows what a boundary costs, a principal knows
 * which ones will actually be respected.
 *
 * "Other School Staff" is last and real: this list will always be missing
 * somebody's title.
 */
export const JOBS = [
  'Teacher',
  'Instructional Assistant',
  'Counselor',
  'Social Worker',
  'School Psychologist',
  'Instructional Coach',
  'Principal',
  'Assistant Principal',
  'Dean',
  'Librarian',
  'Nurse',
  'Office Staff',
  'District Staff',
  'Custodial',
  'Other School Staff',
];

/** The band someone works in. Grade-level detail is not asked for. */
export const LEVELS = ['PreK', 'Elementary', 'Middle', 'High', 'Multiple'];

export type FeedAuthor = {
  id: string;
  /**
   * What they want to be called. Not unique — two people may both be "Ms P",
   * and that is fine, because this is a label rather than an identifier.
   */
  displayName: string;
  /**
   * The identifier. One per account, unique across the app, and the thing a
   * follow actually points at. See lib/usernames.ts for why it has to be.
   */
  username: string;
  /** What they do. One of JOBS, if they chose to show it. */
  job?: string;
  /** One of LEVELS, if they chose to show it. */
  level?: string;
  /**
   * State, if they chose to show it. Derived from their school ZIP rather than
   * typed, so every byline spells it the same way.
   */
  state?: string;
  /**
   * The school's ZIP. Never shown — it is what "near my school" is computed
   * from, and it resolves to the state above.
   */
  zip?: string;
  /**
   * Years in education. The credential the feed actually runs on: "no work
   * email after six, held nine days" reads differently from someone in their
   * first year than from someone twenty-two years in, and a reader deciding
   * whether to copy a habit is entitled to know which.
   */
  years?: number;
};

export const AUTHORS: Record<string, FeedAuthor> = {
  // Everything shown.
  t1: {
    id: 't1', displayName: 'Marisa Okonjo', username: 'marisa.okonjo', zip: '20002',
    job: 'Teacher', level: 'Elementary', state: 'DC', years: 12,
  },
  // Name and job, no location.
  t2: {
    id: 't2', displayName: 'Dana W.', username: 'danaw', zip: '94110',
    job: 'Teacher', level: 'High', state: 'CA', years: 4,
  },
  // Not a teacher, and the reason to read them.
  t3: {
    id: 't3', displayName: 'Mr R', username: 'mrr_counsel', zip: '20019',
    job: 'Counselor', level: 'Middle', state: 'DC', years: 19,
  },
  // A display name two people could plausibly both want. The username is what
  // keeps them apart, and what a follow is actually attached to.
  t4: {
    id: 't4', displayName: 'Ms P', username: 'msp.dc', zip: '20011',
    job: 'Social Worker', years: 7,
  },
  // A principal, which is worth seeing in a feed about protecting your time.
  t5: {
    id: 't5', displayName: 'Jonah Feld', username: 'jonahfeld', zip: '20852',
    job: 'Principal', level: 'Elementary', state: 'MD', years: 22,
  },
  // First year, and saying so. The number is not a ranking.
  t6: {
    id: 't6', displayName: 'quietroom', username: 'quietroom', zip: '97202',
    job: 'Teacher', level: 'High', state: 'OR', years: 1,
  },
};

/**
 * Usernames already claimed. Stands in for the server's index while
 * PROVIDER_CONFIGURED is false, so the availability check has something real to
 * collide with — try to sign up as `danaw` and it will tell you no.
 */
export const TAKEN_USERNAMES = Object.values(AUTHORS).map((a) => a.username);

/** "12 YRS", or "FIRST YEAR" — which is a fact, not a lesser one. */
export function yearsLabel(years: number | undefined | null): string {
  if (years === undefined || years === null) return '';
  if (years <= 0) return 'NEW THIS YEAR';
  if (years === 1) return 'FIRST YEAR';
  return `${years} YRS`;
}

/** The byline: whatever they chose to show, in a fixed order, joined with dots. */
export function authorLine(author: FeedAuthor | undefined): string {
  if (!author) return '';
  return [author.job, author.level, author.state, yearsLabel(author.years)]
    .filter(Boolean)
    .join(' · ');
}

export type FeedUpdate = {
  id: string;
  /** Index into AUTHORS. */
  authorId: string;
  /**
   * One thing a teacher did for themselves, written so another teacher could
   * do the same. This is the whole point of the feed: you should be able to
   * take it, not just recognize it.
   */
  text: string;
  /**
   * There is no streak here, deliberately.
   *
   * "HELD 9 DAYS" used to sit on every post, and it was the best evidence the
   * feed had: proof a habit is keepable, from someone keeping it. It is also
   * computed from the poster's own tick history, which the app promises never
   * leaves their phone — so publishing it broke the one guarantee everything
   * else rests on. A post says what someone did. How consistently they have
   * done it is between them and their record.
   */
  /** How long ago. */
  meta: string;
  /** Tint, so the feed still reads at a glance. */
  dot: string;
  /** Optional photo, as a data URI. See the samples below. */
  photo?: string;
  /** What other people have already sent. The user's own tap adds to these. */
  reactions: Partial<Record<ReactionId, number>>;
};

/**
 * Sample photos: soft two-stop washes, generated as PNG rather than shipped as
 * image files. There are no real photographs to use, and a stock classroom
 * photo would be a lie about who posted it — these read as "a photo is here"
 * without pretending to be one. A real post carries a downscaled JPEG from the
 * picker (lib/photo.ts), and the feed renders both the same way.
 */
const SAMPLE_PHOTO_PARK =
  'data:image/png;base64,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';
const SAMPLE_PHOTO_DRAWER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAAB4CAIAAAA48Cq8AAAFIUlEQVR42u3aB3LbMBSEYdz/RunNKerF6rIdt/gcIQVKFCCAoognyyT+mT3CN/s44Kp3rcV+3ltpZ/nQnjvz0ZNPHXc+d2bOfNmla+SrJ9+6Uzu9NN89+eHJVW9y1Xfkpye/9jPI83tw7cwfZ4bXLU/aw7EzHZ2Rna4nvdHIyDhL35OBJ8ProTMjT8bbKC+pVlVS7aqkOlVJdYtIoer1VY0nW1gU1Qmk+lVJDaqSqpuqFJZUUXH+KCpNygOrEeeviFTvBFKoqqbKhMX5awap0RFSr6DqejJQr1lUqGp8USWkdNQFiuptn79Tv9NRdagqh8X5o6gEVaWw6vKdjqpaFNURWE0oql4NnqmaqsoNi/NHUYWQSjKxYNX9mQpVF1c12UZRVJchNSxLqo6qMlinFhWqKKoCUhms2P7S/ELV+VVNph5YFFUzSF1KlQOWVFGhKs6iSjLdRF24qLpNeKZClaXKgMX5o6gqqpraqjJYjIlRJVVUOSzGxIyJxVV5YXH+KKoypHyqHLAYE6MqpKiSzKb9JIqiYkwsriqHxZiYopIilcNiTIwqWVUpLIqKMbG4KjcsxsQUVQipJPNDWIyJox0TC6qaz0xYnL+Yx8QnPVN5Vc2yKMbEnD/BojJgUVSMiWVVpbBQRVGVIVXm/LlgMSZGlURR6SxSWBQVY2JpVTYsVFFU4aQMWE0dE6PqIqoyWBRVdGPiM6tKYTEmpqhkSXlhMSZGVaCq5aynOH+MiSs8UxWrMmAxJqaowotqF0VRMSYWV7Wcb2ChiqIqQ6qUqnkWxZgYVYJF5YFFUUU8JhZUtTJgoYqiCialVW1hMSZGlVBRrXJYFBVjYmlVKSzGxBSVLKkiWG+L1IAxcc1UuWFRVHGOiU96pipWtbZgMSamqAKLar2NoqgYE4urymGhiqIKP38GLMbEqBIsqiOwKCpZUqM6jIkFVa0XLliooqhCSCW5WXQVY2JUCapKSOkoiooxceB3+qGqDJbvOx1VFFUFUhksxsSoEle1gUVRMSaupmrhVeWAxZiYogopqiS3myiKijGxuCoDFqoiHxOHn79bCxZjYs6fVFHlsCgqxsTiqrywUEVRlSHlU+WAxZgYVSFFleRuE0VRMSYO/E4/VHW33MJiTExRiRRVQkpHMSZGlbiqFBZFxZhY4Pwt7SjGxBSVYFHp/F12FEXFmFhc1QYWqqIpqnOfv52qHBZjYs6fSFEZsCgqxsSyqlJYqKKoypAqc/6OwHprY2JU1eX87XJ/CIuiinZMLFJUWpUNC1UUVWBR3VuwGBOjSlBVBouiYkwscv6yrNIoxsQUlWBRaVUuWBTVOcbEkal6sGGhKuIxcfj526kyYDEm5vyFF9WDAYuiYkwsqmoDC1UUldD5M2AxJkaVYFEVwaKo4hwTixSVzuOqrVBFUQkWlVZlwGJMjKpAVZqUAYuiYkwcfv4MWIyJKSrBojoCizFxhGNiQVVuWBRVnGPi8POXZd1+WpuwTv1Lw5iY82flaZ1FUVQlSc2aPiYWVJXDQhVFFX7+DFiMiVElWFQmLIqKMbFQUe3BQhVFVamoClQ9W7AYE6Mq5PxpUs8WLIoq8jFx+Pl7tmAxJqaopIoqh8WYmDGxuCovLIoqwjFx+PkrgsWYmPMXUlRJ/q1bSRRFxZhYXJUBC1WRj4nDz1+m6iaNYkzM+RMsKq0qhUVRMSYWLCoPLFRRVBKq9mAxJo5+TBx+/nReNlEUFWPiR7mieslhoYrzJ1dUu/wH7VB7zFsgXUsAAAAASUVORK5CYII=';
const SAMPLE_PHOTO_SUNDAY =
  'data:image/png;base64,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';

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
    authorId: 't1',
    text: 'Left at 4:30 and did the grading at home with the TV on.',
    meta: '40 MIN AGO',
    dot: 'rgba(117,174,129,0.65)',
    reactions: { felt: 14, holding: 3, same: 6 },
  },
  {
    id: '2',
    authorId: 't2',
    text: 'Ate lunch in the park instead of at my desk.',
    meta: '2 HR AGO',
    dot: 'rgba(120,180,152,0.65)',
    photo: SAMPLE_PHOTO_PARK,
    reactions: { felt: 21, same: 9 },
  },
  {
    id: '3',
    authorId: 't3',
    text: 'Said no to covering another class this week.',
    meta: '3 HR AGO',
    dot: 'rgba(112,180,168,0.65)',
    reactions: { felt: 30, holding: 11, same: 4 },
  },
  {
    id: '4',
    authorId: 't4',
    text: 'Phone goes in a drawer at 7pm and stays there.',
    meta: '5 HR AGO',
    dot: 'rgba(108,178,184,0.6)',
    photo: SAMPLE_PHOTO_DRAWER,
    reactions: { felt: 17, holding: 2, same: 12 },
  },
];

/**
 * What the free plan holds.
 *
 * The feed is not the thing being sold. Reading it, posting to it and reacting
 * are all free at every tier, because a feed with a paywall across it has no
 * supply and nothing to sell. What Tended+ buys is depth in the teacher's own
 * record: a list longer than three lines, and a history longer than this week.
 *
 * Both limits are chosen so the free plan is genuinely usable — three habits is
 * a real plan, and a week is a real check-in — and so the reason to upgrade
 * arrives from having used the app rather than from being blocked on day one.
 */
export const FREE_LIST_LIMIT = 3;

/** Days of check-in history the free plan can see. */
export const FREE_HISTORY_DAYS = 7;

/** Behind "See the last hour" — older than the four above, same shape. */
export const LAST_HOUR_UPDATES: FeedUpdate[] = [
  {
    id: '5',
    authorId: 't5',
    text: 'Walked the long way to the car. Fifteen minutes, no phone.',
    meta: '6 HR AGO',
    dot: 'rgba(120,180,152,0.65)',
    reactions: { felt: 12, same: 7 },
  },
  {
    id: '6',
    authorId: 't6',
    text: 'Booked the therapy appointment I had been putting off since March.',
    meta: '7 HR AGO',
    dot: 'rgba(117,174,129,0.65)',
    reactions: { felt: 41, holding: 9, same: 3 },
  },
  {
    id: '7',
    authorId: 't1',
    text: 'No school work before noon on Sundays.',
    meta: '8 HR AGO',
    dot: 'rgba(112,175,197,0.6)',
    photo: SAMPLE_PHOTO_SUNDAY,
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

/**
 * Sample conversations, so the inbox has something in it before there is a
 * backend. The teacher's own replies are real and persist; these opening
 * messages stand in for what a server would deliver.
 *
 * Every thread starts from something the other person posted. That is
 * deliberate: a message you can only send after reading someone's post about
 * their own week is a different object from a cold DM, and it is the only kind
 * this app has a reason to carry.
 */
export type SampleMessage = { from: 'them' | 'me'; text: string; minutesAgo: number };

export const CONVERSATIONS: { authorId: string; messages: SampleMessage[] }[] = [
  {
    authorId: 't3',
    messages: [
      {
        from: 'them',
        text: 'Saw you saved the 4:30 one. It took me a term to make it stick — the first fortnight was the hard part.',
        minutesAgo: 95,
      },
      { from: 'me', text: 'That is reassuring. Three days in and it feels rude.', minutesAgo: 82 },
      {
        from: 'them',
        text: 'It stops feeling rude. Nobody has ever once asked me where I went.',
        minutesAgo: 74,
      },
    ],
  },
  {
    authorId: 't5',
    messages: [
      {
        from: 'them',
        text: 'As an admin — if someone tells me they are leaving at 4:30, I would far rather know than guess. Say it out loud and it usually just becomes normal.',
        minutesAgo: 400,
      },
    ],
  },
  {
    authorId: 't6',
    messages: [
      { from: 'them', text: 'First year here. How do you stop taking the bad days home?', minutesAgo: 1500 },
      {
        from: 'me',
        text: 'Badly, mostly. The walk to the car with no phone is the only thing that has worked.',
        minutesAgo: 1440,
      },
    ],
  },
];

export const PRICING = {
  price: '$4.99',
  cadence: 'a month · or $39 a year',
  cta: 'Try 30 days free',
};

/** Length of the free trial, in days. Matches PRICING.cta. */
export const TRIAL_DAYS = 30;

/**
 * Offered during onboarding. All of them are small, same-day and answerable yes
 * or no — a habit you cannot tick by four o'clock is a resolution, and this is
 * not that. They have to be doable on a bad day, because a bad day is when the
 * list matters.
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

/** What the paywall says you get. */
export const PLUS_BENEFITS = [
  'A self-care list as long as you want, not three items',
  'Every check-in you have ever made, not just this week',
  'Six weeks of every item on your list, week by week',
  'Month and semester views, and this year against last',
  'Export your full record as a file',
];
