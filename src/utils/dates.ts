export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Local calendar key "YYYY-MM-DD" — safe for grouping and comparisons. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const weekdayLong = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
const weekdayShort = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const monthDayYear = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const dateLong = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const dateLongYear = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

/** "10:00 AM" */
export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

/** "8:00 – 10:00 AM" or just "8:00 AM". */
export function formatTimeRange(start: Date, end?: Date): string {
  if (!end) return formatTime(start);
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** "Saturday" / "Sat" */
export function formatWeekday(date: Date, style: 'long' | 'short' = 'long'): string {
  return (style === 'long' ? weekdayLong : weekdayShort).format(date);
}

/** "Sep 5" */
export function formatMonthDay(date: Date): string {
  return monthDay.format(date);
}

/** "Sep 5, 2026" */
export function formatMonthDayYear(date: Date): string {
  return monthDayYear.format(date);
}

/** "Saturday, September 5" (adds the year when it differs from today's). */
export function formatDateLong(date: Date, now: Date = new Date()): string {
  return (date.getFullYear() === now.getFullYear() ? dateLong : dateLongYear).format(date);
}

/** "TODAY" / "TOMORROW" / null */
export function relativeDayLabel(date: Date, now: Date = new Date()): string | null {
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, addDays(now, 1))) return 'Tomorrow';
  return null;
}

/** "Sep 5 – 6" or "Sep 30 – Oct 2" */
export function formatDateSpan(start: Date, end: Date): string {
  if (isSameDay(start, end)) return formatMonthDay(start);
  if (start.getMonth() === end.getMonth()) {
    return `${formatMonthDay(start)} – ${end.getDate()}`;
  }
  return `${formatMonthDay(start)} – ${formatMonthDay(end)}`;
}

/** Short zone name for the browser, e.g. "EDT", "GMT+2". */
export function localTimeZoneName(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(date);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? 'local time';
}

/** IANA zone id of the browser, e.g. "America/New_York". */
export function localTimeZoneId(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
}

export interface WeekendWindow {
  /** Section label for the Home timeline. */
  label: 'This weekend' | 'Coming up';
  /** Window start (now). */
  start: Date;
  /** End of the coming Sunday. */
  end: Date;
  /** Friday 00:00 of the coming weekend (may be in the past). */
  weekendStart: Date;
  weekendEnd: Date;
  nextWeekendStart: Date;
  nextWeekendEnd: Date;
}

/**
 * Thursday–Sunday: "This weekend" through Sunday night.
 * Monday–Wednesday: "Coming up" through the next Sunday night.
 */
export function getWeekendWindow(now: Date = new Date()): WeekendWindow {
  const dow = now.getDay(); // 0 = Sunday
  const daysUntilSunday = dow === 0 ? 0 : 7 - dow;
  const weekendEnd = endOfDay(addDays(now, daysUntilSunday));
  const weekendStart = startOfDay(addDays(weekendEnd, -2));
  const isWeekendMode = dow === 0 || dow >= 4;
  return {
    label: isWeekendMode ? 'This weekend' : 'Coming up',
    start: now,
    end: weekendEnd,
    weekendStart,
    weekendEnd,
    nextWeekendStart: addDays(weekendStart, 7),
    nextWeekendEnd: addDays(weekendEnd, 7),
  };
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export function countdownParts(target: Date, now: Date): CountdownParts {
  const totalMs = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
  };
}

/** "2h 15m", "45m", "3d 4h" */
export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / MINUTE_MS);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
}

/** "Updated 12 min ago" style helper. */
export function formatAge(fromMs: number, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - fromMs);
  if (diff < MINUTE_MS) return 'just now';
  if (diff < HOUR_MS) return `${Math.round(diff / MINUTE_MS)} min ago`;
  if (diff < DAY_MS) return `${Math.round(diff / HOUR_MS)} h ago`;
  return `${Math.round(diff / DAY_MS)} d ago`;
}

export function parseIso(iso: string): Date {
  return new Date(iso);
}
