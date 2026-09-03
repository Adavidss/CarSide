/**
 * Remote JSON feed provider. Fetches additional curated feeds (same schema as
 * src/data/events.json) from URLs listed in appConfig.eventFeeds — e.g. a raw
 * GitHub file or Gist that can be edited without redeploying the site.
 * Hosts must send CORS headers; feeds that fail are reported, never fatal.
 */
import type { CuratedFeed, EventProvider } from '@/models/events';
import { loadWithCache } from '@/services/cache';
import { fetchJson } from '@/services/http';
import { HOUR_MS } from '@/utils/dates';
import { expandCuratedFeed } from './curated';

export function createRemoteFeedProvider(url: string): EventProvider {
  let label: string;
  try {
    label = new URL(url).hostname;
  } catch {
    label = url;
  }
  const id = `feed:${label}`;
  return {
    id,
    name: `Feed · ${label}`,
    description: url,
    async getEvents(context) {
      const loaded = await loadWithCache<CuratedFeed>({
        key: `feed:${url}`,
        ttlMs: 6 * HOUR_MS,
        fetcher: async () => {
          const data = await fetchJson<CuratedFeed>(url, { signal: context.signal });
          if (!Array.isArray(data?.events)) throw new Error('Feed has no "events" array');
          return data;
        },
      });
      return expandCuratedFeed(loaded.data, context, id, loaded.data.name ?? `Feed · ${label}`);
    },
  };
}
