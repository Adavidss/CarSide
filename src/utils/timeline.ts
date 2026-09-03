import type { EventWithDistance } from '@/models/events';
import type { F1Race, F1Session } from '@/models/f1';
import { dayKey, endOfDay, startOfDay } from './dates';

/** One row in the merged weekend timeline: an F1 session or a local automotive event. */
export type TimelineItem =
  | {
      kind: 'f1';
      id: string;
      start: Date;
      end: Date;
      race: F1Race;
      session: F1Session;
      dateOnly: false;
      ongoing: boolean;
    }
  | {
      kind: 'event';
      id: string;
      start: Date;
      end?: Date;
      event: EventWithDistance;
      /** allDay or time-TBD — sorts after timed items within a day. */
      dateOnly: boolean;
      /** Started before the window (multi-day event already under way). */
      ongoing: boolean;
    };

export interface TimelineOptions {
  races?: F1Race[];
  events?: EventWithDistance[];
  from: Date;
  to: Date;
}

/** When an item stops being relevant: its end, or the end of its day for date-only entries. */
function lastMoment(item: TimelineItem): number {
  if (item.end) return item.end.getTime();
  return item.dateOnly ? endOfDay(item.start).getTime() : item.start.getTime();
}

export function f1Items(races: F1Race[], from: Date, to: Date): TimelineItem[] {
  const out: TimelineItem[] = [];
  for (const race of races) {
    for (const session of race.sessions) {
      const start = new Date(session.start);
      const end = new Date(session.end);
      if (end.getTime() < from.getTime() || start.getTime() > to.getTime()) continue;
      out.push({
        kind: 'f1',
        id: `f1:${race.season}:${race.round}:${session.key}`,
        start,
        end,
        race,
        session,
        dateOnly: false,
        ongoing: start.getTime() < from.getTime(),
      });
    }
  }
  return out;
}

export function eventItems(events: EventWithDistance[], from: Date, to: Date): TimelineItem[] {
  const out: TimelineItem[] = [];
  for (const event of events) {
    const start = new Date(event.start);
    const end = event.end ? new Date(event.end) : undefined;
    if ((end ?? start).getTime() < from.getTime() || start.getTime() > to.getTime()) continue;
    out.push({
      kind: 'event',
      id: event.id,
      start,
      end,
      event,
      dateOnly: Boolean(event.allDay || event.timeTbd),
      ongoing: start.getTime() < startOfDay(from).getTime(),
    });
  }
  return out;
}

function sortKey(item: TimelineItem): string {
  // Day, then timed items before date-only ones, then start time.
  return `${dayKey(item.start)}|${item.dateOnly ? 1 : 0}|${item.start.toISOString()}`;
}

export function buildTimeline({ races = [], events = [], from, to }: TimelineOptions): TimelineItem[] {
  const items = [...f1Items(races, from, to), ...eventItems(events, from, to)];
  return items.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));
}

export function isLive(item: TimelineItem, now: Date): boolean {
  if (item.dateOnly || !item.end) return false;
  const t = now.getTime();
  return item.start.getTime() <= t && t < item.end.getTime();
}

/**
 * The single most relevant thing: whatever is live (the most recently started one if
 * several overlap), otherwise the next timed item to start, otherwise the next
 * date-only item still ahead of us.
 */
export function pickNextUp(items: TimelineItem[], now: Date): TimelineItem | undefined {
  const t = now.getTime();
  const live = items
    .filter((item) => isLive(item, now))
    .sort((a, b) => b.start.getTime() - a.start.getTime())[0];
  if (live) return live;
  const timed = items
    .filter((item) => !item.dateOnly && item.start.getTime() > t)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  if (timed) return timed;
  return items
    .filter((item) => item.dateOnly && lastMoment(item) >= t)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
}

export interface DayGroup {
  key: string;
  date: Date;
  items: TimelineItem[];
}

/** Group by local day. Items already under way are filed under today. */
export function groupByDay(items: TimelineItem[], now: Date): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  const today = startOfDay(now);
  for (const item of items) {
    const date = item.ongoing && item.start.getTime() < today.getTime() ? today : startOfDay(item.start);
    const key = dayKey(date);
    let group = groups.get(key);
    if (!group) {
      group = { key, date, items: [] };
      groups.set(key, group);
    }
    group.items.push(item);
  }
  return [...groups.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}
