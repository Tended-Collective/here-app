/**
 * Design tokens for the "quiet paper" treatment (Tended App v3).
 *
 * The prototype was authored in OKLCH, which React Native cannot parse, so every
 * colour below is the sRGB conversion of its OKLCH source. The source value is
 * kept in a comment so the ramp can be retuned against the original design.
 */

export const color = {
  /** Canvas behind the device frame on wide screens. */
  canvas: '#eceae5',
  device: '#17161a',

  /** Warm off-white ground. */
  ground: '#f6f5f2',
  card: '#ffffff',
  /** Unselected mood rows sit between the ground and a full white card. */
  cardSoft: 'rgba(255,255,255,0.6)',

  ink: '#191817',
  body: '#4a463f',
  muted: '#6f6b64',
  label: '#8a8579',
  faint: '#a9a49a',
  fainter: '#b9b4aa',
  tabIdle: '#a09b92',

  hairline: 'rgba(0,0,0,0.08)',
  divider: 'rgba(0,0,0,0.07)',
  rule: 'rgba(0,0,0,0.06)',
  outline: 'rgba(0,0,0,0.1)',
  outlineStrong: 'rgba(0,0,0,0.12)',
  track: 'rgba(0,0,0,0.08)',

  /** The one interactive accent — oklch(.45 .07 210). */
  accent: '#17606b',
  accentBorder: 'rgba(23,96,107,0.35)',
  accentBorderSoft: 'rgba(23,96,107,0.4)',
} as const;

export type Mood = {
  label: string;
  /**
   * How the day is answered on the feed: one tap on a face. The label is still
   * the accessible name, so the button announces "Worn down" rather than the
   * codepoint's own description, and it is what the record reads back.
   */
  emoji: string;
  /** Solid swatch — used for the selection ring and the row dot. */
  color: string;
  /** Same hue at the alpha the charts use. */
  fill: string;
};

/**
 * The five-step ramp. Index 0 is the best day; the stored score is index + 1, so
 * the persisted table matches the design note's "a number from one to five".
 *
 * The design's scale ran Good / Okay / Worn down / Running empty / Rough — one
 * good day, one neutral one and three bad ones. A teacher having a genuinely
 * fine day had a single box to put it in while a bad one had three, which both
 * asks a leading question and skews every average built on the answer. It is
 * now even: two above the middle, two below.
 *
 * Hue is spaced evenly from the green anchor to the red one — 150, 119, 88, 56,
 * 25 — so the colour ramp is as even as the wording. The two ends are the
 * design's own values, unchanged; every hex is the sRGB conversion of the OKLCH
 * beside it.
 */
export const MOODS: Mood[] = [
  { label: 'Great', emoji: '😄', color: '#7aad84', fill: 'rgba(122,173,132,0.5)' }, //     oklch(.7 .08 150)
  { label: 'Good', emoji: '🙂', color: '#a5b278', fill: 'rgba(165,178,120,0.5)' }, //      oklch(.74 .08 119)
  { label: 'Okay', emoji: '😐', color: '#cdb57b', fill: 'rgba(205,181,123,0.5)' }, //      oklch(.78 .08 88)
  { label: 'Worn down', emoji: '😮‍💨', color: '#d79c73', fill: 'rgba(215,156,115,0.5)' }, // oklch(.74 .09 56)
  { label: 'Rough', emoji: '😞', color: '#b46762', fill: 'rgba(180,103,98,0.5)' }, //      oklch(.6 .1 25)
];

export const TAGS = ['Workload', 'No break', 'Behaviour', 'Admin asks', 'Parents', 'Sleep'];

/** Seven-step ramp for the ZIP heatmap tiles. Cell value 0 renders nothing. */
export const HEAT_RAMP = [
  'rgba(122,173,132,0.35)',
  'rgba(122,173,132,0.55)',
  'rgba(182,172,113,0.5)',
  'rgba(214,177,125,0.55)',
  'rgba(207,139,116,0.5)',
  'rgba(207,139,116,0.65)',
  'rgba(180,103,98,0.6)',
];

/** Steady → rough, for the legend under the heatmap. */
export const HEAT_LEGEND = [
  'rgba(122,173,132,0.5)',
  'rgba(182,172,113,0.5)',
  'rgba(214,177,125,0.55)',
  'rgba(207,139,116,0.6)',
  'rgba(180,103,98,0.65)',
];

export const font = {
  displayLight: 'Newsreader_300Light',
  displayRegular: 'Newsreader_400Regular',
  mono: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_600SemiBold',
} as const;

/**
 * The prototype's tracked-out mono labels. CSS letter-spacing is em-relative and
 * React Native's is absolute, so the em value is multiplied through by the size.
 */
export function monoLabel(size = 10, em = 0.14, bold = false) {
  return {
    fontFamily: bold ? font.monoBold : font.mono,
    fontSize: size,
    letterSpacing: size * em,
  } as const;
}

export const radius = {
  card: 18,
  row: 16,
  button: 15,
  tile: 5,
  bar: 7,
  pill: 99,
} as const;

/** Content inset inside the phone's scroll area. */
export const SCREEN_PADDING = { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 28 } as const;

/** Device metrics from the design canvas. */
export const DEVICE = { width: 402, height: 874, radius: 46, bezel: 10, screenRadius: 37 } as const;

export const TAB_BAR_HEIGHT = 86;
export const STATUS_BAR_HEIGHT = 54;
