/**
 * Remote JSON feed provider. Fetches additional curated feeds (same schema as
 * src/data/events.json) from the feeds listed in appConfig.eventFeeds — by default a
 * GitHub Gist that can be edited without redeploying the site.
 * Hosts must send CORS headers; feeds that fail are reported, never fatal.
 */
import type { CuratedFeed, EventProvider } from '@/models/events';
import { loadWithCache } from '@/services/cache';
import { fetchJson } from '@/services/http';
import { HOUR_MS } from '@/utils/dates';
import { expandCuratedFeed } from './curated';

export interface RemoteFeedConfig {
  /** Shown on the Nearby page's source list. */
  name: string;
  /** Raw JSON URL. */
  url: string;
}

export function createRemoteFeedProvider({ name, url }: RemoteFeedConfig): EventProvider {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    host = url;
  }
  const id = `feed:${host}`;
  return {
    id,
    name,
    description: url,
    async getEvents(context) {
      const loaded = await loadWithCache<CuratedFeed>({
        key: `feed:${url}`,
        ttlMs: HOUR_MS,
        fetcher: async () => {
          const data = await fetchJson<CuratedFeed>(url, { signal: context.signal });
          if (!Array.isArray(data?.events)) throw new Error('Feed has no "events" array');
          return data;
        },
      });
      return expandCuratedFeed(loaded.data, context, id, loaded.data.name ?? name);
    },
  };
}
