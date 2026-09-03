/**
 * Event provider registry. Add a provider to `providers` and it shows up everywhere.
 * One provider failing never blanks the list — failures are reported alongside results.
 */
import { appConfig } from '@/config/appConfig';
import type {
  CarEvent,
  EventProvider,
  EventProviderReport,
  EventSearchContext,
  EventSearchResult,
  EventWithDistance,
} from '@/models/events';
import { haversineMiles } from '@/utils/distance';
import { dedupeEvents } from './dedupe';
import { curatedProvider } from './providers/curated';
import { createRemoteFeedProvider } from './providers/remoteFeed';

export const providers: EventProvider[] = [
  curatedProvider,
  ...appConfig.eventFeeds.map(createRemoteFeedProvider),
];

function withDistance(event: CarEvent, context: EventSearchContext): EventWithDistance {
  if (event.latitude == null || event.longitude == null) return event;
  return {
    ...event,
    distanceMiles: haversineMiles(
      { latitude: context.latitude, longitude: context.longitude },
      { latitude: event.latitude, longitude: event.longitude },
    ),
  };
}

export async function searchEvents(context: EventSearchContext): Promise<EventSearchResult> {
  const settled = await Promise.allSettled(providers.map((provider) => provider.getEvents(context)));

  const collected: CarEvent[] = [];
  const reports: EventProviderReport[] = [];
  settled.forEach((result, index) => {
    const provider = providers[index];
    if (result.status === 'fulfilled') {
      collected.push(...result.value);
      reports.push({ providerId: provider.id, providerName: provider.name, count: result.value.length });
    } else {
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
      reports.push({ providerId: provider.id, providerName: provider.name, count: 0, error: message });
    }
  });

  const unique = dedupeEvents(collected).map((event) => withDistance(event, context));
  const events: EventWithDistance[] = [];
  const beyondRadius: EventWithDistance[] = [];
  for (const event of unique) {
    if (event.distanceMiles === undefined) continue; // cannot place it — keep the list honest
    (event.distanceMiles <= context.radiusMiles ? events : beyondRadius).push(event);
  }
  const byStart = (a: CarEvent, b: CarEvent) => a.start.localeCompare(b.start);
  events.sort(byStart);
  beyondRadius.sort(byStart);
  return { events, beyondRadius, reports };
}

/** Look up a single event id across providers (used by the detail page and deep links). */
export async function findEventById(id: string, context: EventSearchContext): Promise<EventWithDistance | undefined> {
  const result = await searchEvents({ ...context, radiusMiles: Number.POSITIVE_INFINITY });
  return result.events.find((event) => event.id === id) ?? result.beyondRadius.find((event) => event.id === id);
}
