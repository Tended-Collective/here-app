/**
 * Fixed sample content. None of this is the user's own data — it stands in for
 * what a backend would return for the area view and the reading list.
 */

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
 * The live nearby feed: check-ins within 15 miles reduced to a number and a tag.
 * No names, no free text and nothing to reply to, so it can't become a place to
 * vent about a colleague.
 */
export const NEARBY_FEED = [
  {
    id: '1',
    text: 'Someone 3 miles away had a rough one.',
    meta: '2 MIN AGO · TAGGED BEHAVIOUR',
    dot: 'rgba(209,136,130,0.65)',
  },
  {
    id: '2',
    text: 'Running empty, second day in a row.',
    meta: '11 MIN AGO · TAGGED WORKLOAD',
    dot: 'rgba(207,139,116,0.65)',
  },
  {
    id: '3',
    text: 'A good day. First in a while.',
    meta: '24 MIN AGO · NO TAGS',
    dot: 'rgba(117,174,129,0.65)',
  },
  {
    id: '4',
    text: 'Worn down — no break again.',
    meta: '38 MIN AGO · TAGGED NO BREAK',
    dot: 'rgba(191,150,93,0.65)',
  },
];

export const POSTS = [
  { id: '1', kicker: 'HELD STORIES · 6 MIN', title: 'The year I stopped answering emails after six' },
  { id: '2', kicker: 'THE SAFETY · 11 MIN AUDIO', title: 'Guided audio for the drive home' },
  { id: '3', kicker: 'PRACTICAL · 4 MIN', title: 'How to ask for a mental-health day' },
];

export const HELP_LINES = [
  { id: '988', title: '988 · Suicide & Crisis Lifeline', sub: 'Call or text, 24/7' },
  { id: 'eap', title: 'Your EAP · 6 free sessions', sub: 'No referral needed' },
  { id: 'grow', title: 'Grow Therapy', sub: 'Therapists who take your plan · evenings' },
  { id: 'union', title: 'Union member assistance', sub: 'Confidential, separate from your district' },
];

export const PRICING = {
  price: '$4.99',
  cadence: 'a month · or $39 a year',
  cta: 'Try 30 days free',
};

/** Six-week trend line behind the Tended+ lock, in a 300×90 viewBox. */
export const LOCKED_TREND =
  '6,66 32,58 58,70 84,48 110,54 136,38 162,44 188,28 214,34 240,20 266,26 288,18';
