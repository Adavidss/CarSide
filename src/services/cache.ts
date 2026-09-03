/**
 * Tiny localStorage cache with timestamps. Every network-backed resource in CarSide
 * goes through `loadWithCache`, which gives us:
 *   - instant loads from fresh cache,
 *   - stale-but-usable data when a provider is down,
 *   - a bundled fallback as the last resort,
 * and reports which of those happened so the UI can say "may be out of date".
 */
const PREFIX = 'carside:cache:';

export interface CacheEntry<T> {
  savedAt: number;
  value: T;
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function readCache<T>(key: string): CacheEntry<T> | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (typeof parsed?.savedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), value } satisfies CacheEntry<T>));
  } catch {
    // Quota exceeded or private mode — caching is best-effort.
  }
}

export function removeCache(key: string): void {
  storage()?.removeItem(PREFIX + key);
}

export function clearAllCaches(): number {
  const store = storage();
  if (!store) return 0;
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => store.removeItem(k));
  return keys.length;
}

export type LoadSource = 'network' | 'cache' | 'stale-cache' | 'fallback';

export interface Loaded<T> {
  data: T;
  /** When the data was fetched from the network (null for bundled fallbacks). */
  updatedAt: number | null;
  source: LoadSource;
  /** True when the data could not be refreshed and may be out of date. */
  stale: boolean;
  error?: string;
}

export interface LoadOptions<T> {
  key: string;
  ttlMs: number;
  fetcher: () => Promise<T>;
  /** Bundled data used only when there is neither fresh nor stale cache. */
  fallback?: () => T | undefined;
  /** Refuse stale cache older than this (default: unlimited). */
  staleMaxAgeMs?: number;
}

export async function loadWithCache<T>(options: LoadOptions<T>): Promise<Loaded<T>> {
  const { key, ttlMs, fetcher, fallback, staleMaxAgeMs = Number.POSITIVE_INFINITY } = options;
  const cached = readCache<T>(key);
  const now = Date.now();

  if (cached && now - cached.savedAt < ttlMs) {
    return { data: cached.value, updatedAt: cached.savedAt, source: 'cache', stale: false };
  }

  try {
    const data = await fetcher();
    writeCache(key, data);
    return { data, updatedAt: Date.now(), source: 'network', stale: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (cached && now - cached.savedAt < staleMaxAgeMs) {
      return { data: cached.value, updatedAt: cached.savedAt, source: 'stale-cache', stale: true, error: message };
    }
    const fallbackData = fallback?.();
    if (fallbackData !== undefined) {
      return { data: fallbackData, updatedAt: null, source: 'fallback', stale: true, error: message };
    }
    throw err;
  }
}
