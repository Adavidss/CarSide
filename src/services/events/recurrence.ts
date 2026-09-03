import type { RecurrenceRule, Weekday } from '@/models/events';
import { zonedDateParts, zonedTimeToUtc } from '@/utils/zonedTime';

const WEEKDAY_INDEX: Record<Weekday, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

export interface Occurrence {
  start: Date;
  end?: Date;
  /** "YYYY-MM-DD" in the rule's time zone. */
  dateKey: string;
}

function parseTime(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':').map(Number);
  return { hour: h ?? 0, minute: m ?? 0 };
}

function parseDateKey(value: string): { year: number; month: number; day: number } {
  const [y, m, d] = value.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function key(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Day of month for the nth <weekday> of a month, or null if it does not exist. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, ordinal: number): number | null {
  const total = daysInMonth(year, month);
  if (ordinal > 0) {
    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const day = 1 + ((weekday - firstWeekday + 7) % 7) + (ordinal - 1) * 7;
    return day <= total ? day : null;
  }
  const lastWeekday = new Date(Date.UTC(year, month - 1, total)).getUTCDay();
  return total - ((lastWeekday - weekday + 7) % 7);
}

function buildOccurrence(
  rule: RecurrenceRule,
  year: number,
  month: number,
  day: number,
): Occurrence {
  const startTime = parseTime(rule.startTime);
  const start = zonedTimeToUtc(year, month, day, startTime.hour, startTime.minute, rule.timezone);
  let end: Date | undefined;
  if (rule.endTime) {
    const endTime = parseTime(rule.endTime);
    end = zonedTimeToUtc(year, month, day, endTime.hour, endTime.minute, rule.timezone);
    if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + 86_400_000);
  }
  return { start, end, dateKey: key(year, month, day) };
}

function withinSeason(rule: RecurrenceRule, dateKey: string, month: number): boolean {
  if (rule.seasonStart && dateKey < rule.seasonStart) return false;
  if (rule.seasonEnd && dateKey > rule.seasonEnd) return false;
  if (rule.months?.length && !rule.months.includes(month)) return false;
  if (rule.exceptions?.includes(dateKey)) return false;
  return true;
}

/**
 * Expand a recurrence rule into concrete occurrences whose start falls in [from, to].
 * Occurrences are computed in the rule's own time zone, so "8:00 AM" survives DST changes.
 */
export function expandRecurrence(rule: RecurrenceRule, from: Date, to: Date): Occurrence[] {
  if (to.getTime() < from.getTime()) return [];
  const weekday = WEEKDAY_INDEX[rule.weekday];
  if (weekday === undefined) return [];

  const out: Occurrence[] = [];
  const fromParts = zonedDateParts(from, rule.timezone);
  const toParts = zonedDateParts(to, rule.timezone);

  if (rule.freq === 'monthly') {
    const ordinal = rule.ordinal ?? 1;
    let year = fromParts.year;
    let month = fromParts.month;
    while (year < toParts.year || (year === toParts.year && month <= toParts.month)) {
      const day = nthWeekdayOfMonth(year, month, weekday, ordinal);
      if (day) {
        const dateKey = key(year, month, day);
        if (withinSeason(rule, dateKey, month)) {
          const occurrence = buildOccurrence(rule, year, month, day);
          if (occurrence.start >= from && occurrence.start <= to) out.push(occurrence);
        }
      }
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
    return out;
  }

  // Weekly: walk day by day (in the rule's zone) from the window start.
  const interval = Math.max(1, rule.interval ?? 1);
  const anchor = rule.seasonStart ? parseDateKey(rule.seasonStart) : fromParts;
  const anchorUtc = Date.UTC(anchor.year, anchor.month - 1, anchor.day);
  let cursor = Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day);
  const last = Date.UTC(toParts.year, toParts.month - 1, toParts.day);
  while (cursor <= last) {
    const date = new Date(cursor);
    if (date.getUTCDay() === weekday) {
      const weeksFromAnchor = Math.floor((cursor - anchorUtc) / (7 * 86_400_000));
      if (weeksFromAnchor >= 0 && weeksFromAnchor % interval === 0) {
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();
        const dateKey = key(year, month, day);
        if (withinSeason(rule, dateKey, month)) {
          const occurrence = buildOccurrence(rule, year, month, day);
          if (occurrence.start >= from && occurrence.start <= to) out.push(occurrence);
        }
      }
    }
    cursor += 86_400_000;
  }
  return out;
}

/** Human description of a rule, e.g. "First Saturday monthly · 8:00 – 11:00 AM". */
export function describeRecurrence(rule: RecurrenceRule): string {
  const names: Record<Weekday, string> = {
    SU: 'Sunday',
    MO: 'Monday',
    TU: 'Tuesday',
    WE: 'Wednesday',
    TH: 'Thursday',
    FR: 'Friday',
    SA: 'Saturday',
  };
  const ordinals: Record<number, string> = { 1: 'First', 2: 'Second', 3: 'Third', 4: 'Fourth', 5: 'Fifth', [-1]: 'Last' };
  if (rule.freq === 'weekly') {
    const every = rule.interval && rule.interval > 1 ? `Every ${rule.interval} weeks on ${names[rule.weekday]}` : `Every ${names[rule.weekday]}`;
    return every;
  }
  return `${ordinals[rule.ordinal ?? 1] ?? ''} ${names[rule.weekday]} monthly`.trim();
}
