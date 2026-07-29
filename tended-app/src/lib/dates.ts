/** Date helpers. Everything is keyed on a local-time YYYY-MM-DD string. */

export type ISODate = string;

export function toISO(d: Date): ISODate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): ISODate {
  return toISO(new Date());
}

/** Monday of the week containing `d`. The record and the practice grid both run Mon-first. */
export function mondayOf(d: Date = new Date()): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const shift = (out.getDay() + 6) % 7; // Sunday(0) -> 6
  out.setDate(out.getDate() - shift);
  return out;
}

/** Mon..Sun of the current week as ISO dates. */
export function weekDates(from: Date = new Date()): ISODate[] {
  const monday = mondayOf(from);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toISO(d);
  });
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(d: Date = new Date()): number {
  return (d.getDay() + 6) % 7;
}

/** "THURSDAY 9 OCTOBER", as the design's date label. */
export function longDateLabel(d: Date = new Date()): string {
  return d
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();
}

/** "Wednesday", for the record insight line. */
export function weekdayName(iso: ISODate): string {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-GB', { weekday: 'long' });
}

export const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const WEEKDAY_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
