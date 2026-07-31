/**
 * School ZIP → state, and whether two ZIPs are near each other.
 *
 * The profile used to ask people to type their state. Two problems with that: a
 * free-text field accepts "DC", "D.C.", "Washington DC" and "washington" as
 * four different states, which makes the byline inconsistent and any grouping
 * built on it useless; and it collects nothing the feed can actually sort by.
 * A ZIP is one unambiguous number that answers both — it resolves to a state
 * for display, and it is what "near my school" is computed from.
 *
 * It is the *school's* ZIP, not the teacher's home. That matters: home address
 * is personal data with nothing to do with the product, and asking for it in an
 * app about work would be a different and worse question.
 *
 * The lookup is a local table rather than a request. It has to work on a phone
 * in a building with no signal, it must not tell a third party where someone
 * teaches, and the mapping is stable enough that shipping it is fine.
 *
 * Prefix-to-state is exact and compact. Prefix-to-city is not — that needs a
 * real dataset of about 40,000 rows — so a ZIP resolves to a state and nothing
 * finer. That is also the right resolution to publish: a job title plus a city
 * narrows to very few people in a small district.
 */

type Range = [start: number, end: number, state: string];

/** ZIP3 ranges. Ordered; the first containing range wins. */
const RANGES: Range[] = [
  [5, 5, 'NY'], [6, 9, 'PR'],
  [10, 27, 'MA'], [28, 29, 'RI'], [30, 38, 'NH'], [39, 49, 'ME'],
  [50, 59, 'VT'], [60, 69, 'CT'], [70, 89, 'NJ'],
  [100, 149, 'NY'], [150, 196, 'PA'], [197, 199, 'DE'],
  // 201 is Dulles, Virginia, sitting inside the DC block.
  [200, 200, 'DC'], [201, 201, 'VA'], [202, 205, 'DC'],
  [206, 219, 'MD'], [220, 246, 'VA'], [247, 268, 'WV'],
  [270, 289, 'NC'], [290, 299, 'SC'], [300, 319, 'GA'],
  [320, 339, 'FL'], [341, 342, 'FL'], [344, 344, 'FL'], [346, 347, 'FL'],
  [349, 349, 'FL'],
  [350, 369, 'AL'], [370, 385, 'TN'], [386, 397, 'MS'], [398, 399, 'GA'],
  [400, 427, 'KY'], [430, 459, 'OH'], [460, 479, 'IN'], [480, 499, 'MI'],
  [500, 528, 'IA'], [530, 549, 'WI'], [550, 567, 'MN'], [570, 577, 'SD'],
  [580, 588, 'ND'], [590, 599, 'MT'], [600, 629, 'IL'], [630, 658, 'MO'],
  [660, 679, 'KS'], [680, 693, 'NE'], [700, 714, 'LA'], [716, 729, 'AR'],
  [730, 749, 'OK'], [750, 799, 'TX'], [800, 816, 'CO'], [820, 831, 'WY'],
  [832, 838, 'ID'], [840, 847, 'UT'], [850, 865, 'AZ'], [870, 884, 'NM'],
  [889, 898, 'NV'], [900, 961, 'CA'], [967, 968, 'HI'], [970, 979, 'OR'],
  [980, 994, 'WA'], [995, 999, 'AK'],
];

const STATE_NAMES: Record<string, string> = {
  AK: 'Alaska', AL: 'Alabama', AR: 'Arkansas', AZ: 'Arizona', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DC: 'Washington, D.C.', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', IA: 'Iowa', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  MA: 'Massachusetts', MD: 'Maryland', ME: 'Maine', MI: 'Michigan',
  MN: 'Minnesota', MO: 'Missouri', MS: 'Mississippi', MT: 'Montana',
  NC: 'North Carolina', ND: 'North Dakota', NE: 'Nebraska', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NV: 'Nevada', NY: 'New York', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', PR: 'Puerto Rico',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VA: 'Virginia', VT: 'Vermont',
  WA: 'Washington', WI: 'Wisconsin', WV: 'West Virginia', WY: 'Wyoming',
};

/** Digits only, at most five. */
export function normalizeZip(raw: string): string {
  return raw.replace(/[^0-9]/g, '').slice(0, 5);
}

export function isCompleteZip(raw: string): boolean {
  return normalizeZip(raw).length === 5;
}

/** The two-letter state, or null if the ZIP is incomplete or unassigned. */
export function stateForZip(raw: string): string | null {
  const zip = normalizeZip(raw);
  if (zip.length !== 5) return null;
  const prefix = Number(zip.slice(0, 3));
  const hit = RANGES.find(([start, end]) => prefix >= start && prefix <= end);
  return hit ? hit[2] : null;
}

/** "Washington, D.C." — for confirming a ZIP back to the person who typed it. */
export function stateName(state: string | null): string | null {
  return state ? (STATE_NAMES[state] ?? state) : null;
}

/**
 * Near enough to count as the same area.
 *
 * A shared ZIP3 is roughly a metro or a rural county — the scale at which "a
 * teacher near my school" is true without being so tight that the feed is
 * empty. Deliberately coarser than the ZIP itself: matching all five digits
 * would mean matching a neighbourhood, which in a small district is close to
 * naming the building.
 */
export function isNearby(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = normalizeZip(a);
  const y = normalizeZip(b);
  if (x.length !== 5 || y.length !== 5) return false;
  return x.slice(0, 3) === y.slice(0, 3);
}
