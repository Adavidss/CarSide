/**
 * Curated JSON provider. Reads the hand-maintained feed bundled at src/data/events.json.
 * Entries are either dated (start/end) or recurring (a RecurrenceRule expanded here).
 * The same expansion is reused for remote feeds with the same schema.
 */
import type { CarEvent, CuratedEventEntry, CuratedFeed, EventProvider, EventSearchContext } from '@/models/events';
import feed from '@/data/events.json';
import { expandRecurrence } from '../recurrence';

export const CURATED_PROVIDER_ID = 'curated';

function coordinate(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function baseEvent(entry: CuratedEventEntry, sourceId: string, sourceName: string, sourceUrl?: string): Omit<CarEvent, 'id' | 'start' | 'end'> {
  return {
    title: entry.title,
    subtitle: entry.subtitle,
    type: entry.type,
    allDay: entry.allDay ?? false,
    timeTbd: entry.timeTbd ?? false,
    venue: entry.venue,
    address: entry.address,
    city: entry.city,
    region: entry.region,
    country: entry.country ?? 'US',
    latitude: coordinate(entry.latitude),
    longitude: coordinate(entry.longitude),
    admission: entry.admission ?? undefined,
    setting: entry.setting ?? undefined,
    description: entry.description,
    url: entry.url,
    source: entry.source ?? { id: sourceId, name: sourceName, url: sourceUrl },
    confirmWithOrganizer: entry.confirmWithOrganizer,
    verifiedOn: entry.verifiedOn,
    notes: entry.notes ?? undefined,
    tags: entry.tags,
  };
}

export function expandCuratedFeed(
  data: CuratedFeed,
  context: Pick<EventSearchContext, 'from' | 'to'>,
  sourceId = CURATED_PROVIDER_ID,
  sourceName = data.name ?? 'CarSide curated list',
): CarEvent[] {
  const out: CarEvent[] = [];
  for (const entry of data.events) {
    if (!entry?.id || !entry.title || !entry.type || !entry.city) continue;
    const base = baseEvent(entry, sourceId, sourceName, data.url);

    if (entry.recurrence) {
      for (const occurrence of expandRecurrence(entry.recurrence, context.from, context.to)) {
        out.push({
          ...base,
          id: `${sourceId}:${entry.id}@${occurrence.dateKey}`,
          start: occurrence.start.toISOString(),
          end: occurrence.end?.toISOString(),
          recurring: true,
          confirmWithOrganizer: entry.confirmWithOrganizer ?? true,
        });
      }
      continue;
    }

    if (!entry.start) continue;
    const start = new Date(entry.start);
    if (Number.isNaN(start.getTime())) continue;
    const end = entry.end ? new Date(entry.end) : undefined;
    const lastMoment = end && !Number.isNaN(end.getTime()) ? end : start;
    if (lastMoment.getTime() < context.from.getTime() || start.getTime() > context.to.getTime()) continue;
    out.push({
      ...base,
      id: `${sourceId}:${entry.id}`,
      start: entry.start,
      end: entry.end,
    });
  }
  return out;
}

export const curatedFeed = feed as CuratedFeed;

export const curatedProvider: EventProvider = {
  id: CURATED_PROVIDER_ID,
  name: curatedFeed.name ?? 'CarSide curated list',
  description: 'Hand-maintained events in src/data/events.json',
  async getEvents(context) {
    return expandCuratedFeed(curatedFeed, context);
  },
};
