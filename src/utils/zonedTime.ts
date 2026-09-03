/**
 * Minimal IANA time-zone helpers built on Intl — enough to turn "first Saturday
 * at 08:00 America/New_York" into a real instant without pulling in a date library.
 */

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let dtf = dtfCache.get(timeZone);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    dtfCache.set(timeZone, dtf);
  }
  return dtf;
}

/** Offset of `timeZone` from UTC at `date`, in minutes (positive east of UTC). */
export function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = formatter(timeZone).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** Build the instant for a wall-clock time in a named zone. */
export function zonedTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = tzOffsetMinutes(new Date(guess), timeZone);
  let result = guess - offset * 60000;
  const check = tzOffsetMinutes(new Date(result), timeZone);
  if (check !== offset) result = guess - check * 60000;
  return new Date(result);
}

/** Year/month/day of `date` as seen in `timeZone`. */
export function zonedDateParts(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = formatter(timeZone).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}
