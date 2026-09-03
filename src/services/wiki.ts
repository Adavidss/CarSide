/**
 * Wikipedia + Wikimedia Commons — free, CORS-enabled, no key. Used for circuit photos,
 * driver portraits, short article extracts and the daily featured car photograph.
 * Every image carries its author and licence (CC BY / CC BY-SA / public domain), which the
 * Photo component prints under the picture as the licences require.
 */
import { loadWithCache, type Loaded } from '@/services/cache';
import { DAY_MS } from '@/utils/dates';

const WIKI_REST = 'https://en.wikipedia.org/api/rest_v1';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

export interface WikiSummary {
  title: string;
  extract: string;
  url: string;
  thumbnail?: { source: string; width: number; height: number };
  original?: { source: string; width: number; height: number };
}

export interface PhotoCredit {
  artist: string;
  license: string;
  licenseUrl?: string;
  /** Commons file page — the canonical place for full attribution. */
  pageUrl: string;
}

export interface Photo {
  src: string;
  width: number;
  height: number;
  caption?: string;
  credit: PhotoCredit;
}

const strip = (html: string | undefined) => (html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} from ${new URL(url).hostname}`);
  return (await response.json()) as T;
}

/** "https://en.wikipedia.org/wiki/George_Russell_(racing_driver)" → "George_Russell_(racing_driver)" */
export function wikiTitleFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const match = url.match(/wikipedia\.org\/wiki\/([^#?]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** "https://upload.wikimedia.org/wikipedia/commons/9/90/Some_File.jpg?…" → "File:Some_File.jpg" */
export function fileTitleFromUploadUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const clean = url.split('?')[0];
  const last = clean.split('/').pop();
  if (!last) return null;
  try {
    return `File:${decodeURIComponent(last)}`;
  } catch {
    return `File:${last}`;
  }
}

export function getWikiSummary(title: string, signal?: AbortSignal): Promise<Loaded<WikiSummary>> {
  return loadWithCache({
    key: `wiki:summary:${title}`,
    ttlMs: 7 * DAY_MS,
    fetcher: async () => {
      const data = await getJson<{
        title: string;
        extract: string;
        content_urls?: { desktop?: { page?: string } };
        thumbnail?: { source: string; width: number; height: number };
        originalimage?: { source: string; width: number; height: number };
      }>(`${WIKI_REST}/page/summary/${encodeURIComponent(title)}`, signal);
      return {
        title: data.title,
        extract: data.extract ?? '',
        url: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
        thumbnail: data.thumbnail,
        original: data.originalimage,
      };
    },
  });
}

interface ImageInfoResponse {
  query?: {
    pages?: Record<
      string,
      {
        title: string;
        imageinfo?: Array<{
          url: string;
          thumburl?: string;
          thumbwidth?: number;
          thumbheight?: number;
          width: number;
          height: number;
          descriptionurl?: string;
          extmetadata?: Record<string, { value: string }>;
        }>;
      }
    >;
  };
}

/** Commons file → sized thumbnail plus author/licence. Cached for a month; files rarely change. */
export async function getCommonsImage(fileTitle: string, width = 960, signal?: AbortSignal): Promise<Photo | null> {
  const loaded = await loadWithCache<Photo | null>({
    key: `commons:${width}:${fileTitle}`,
    ttlMs: 30 * DAY_MS,
    fetcher: async () => {
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        origin: '*',
        prop: 'imageinfo',
        iiprop: 'url|extmetadata|size',
        iiurlwidth: String(width),
        iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|ImageDescription',
        titles: fileTitle,
      });
      const data = await getJson<ImageInfoResponse>(`${COMMONS_API}?${params}`, signal);
      const page = Object.values(data.query?.pages ?? {})[0];
      const info = page?.imageinfo?.[0];
      if (!info) return null;
      const meta = info.extmetadata ?? {};
      const artist = strip(meta.Artist?.value) || 'Unknown author';
      const license = meta.LicenseShortName?.value ?? 'See file page';
      return {
        src: info.thumburl ?? info.url,
        width: info.thumbwidth ?? info.width,
        height: info.thumbheight ?? info.height,
        caption: strip(meta.ImageDescription?.value) || undefined,
        credit: {
          artist: artist.length > 60 ? `${artist.slice(0, 57)}…` : artist,
          license,
          licenseUrl: meta.LicenseUrl?.value,
          pageUrl: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(fileTitle)}`,
        },
      };
    },
  });
  return loaded.data;
}

interface MediaListItem {
  type: string;
  title: string;
  caption?: { text?: string };
  srcset?: Array<{ src: string; scale: string }>;
}

const EXCLUDE = /logo|map|layout|flag|diagram|\.svg|\.png|\.gif|plan|schematic|helmet|coat_of_arms|signature|icon/i;
const PREFER = /aerial|satellite|circuit|track|banking|grandstand|paddock|straight|corner|chicane|turn|curve|start|race|grand_prix|gp/i;

/** Best photograph from an article's media list, with credit. Prefers recent, track-related shots. */
export function getArticlePhoto(title: string, signal?: AbortSignal): Promise<Loaded<Photo | null>> {
  return loadWithCache<Photo | null>({
    key: `wiki:photo:${title}`,
    ttlMs: 7 * DAY_MS,
    fetcher: async () => {
      const data = await getJson<{ items?: MediaListItem[] }>(`${WIKI_REST}/page/media-list/${encodeURIComponent(title)}`, signal);
      const photos = (data.items ?? []).filter((i) => i.type === 'image' && /\.jpe?g$/i.test(i.title) && !EXCLUDE.test(i.title));
      if (!photos.length) return null;
      const score = (i: MediaListItem) => {
        const text = `${i.title} ${i.caption?.text ?? ''}`;
        let s = 0;
        if (PREFER.test(text)) s += 2;
        const year = text.match(/\b(19\d\d|20\d\d)\b/);
        if (year) s += Number(year[1]) >= 2010 ? 2 : Number(year[1]) >= 1990 ? 1 : 0;
        if (/bundesarchiv|19[0-5]\d/i.test(text)) s -= 2;
        return s;
      };
      const best = [...photos].sort((a, b) => score(b) - score(a))[0];
      const photo = await getCommonsImage(best.title, 1200, signal);
      if (!photo) return null;
      return { ...photo, caption: strip(best.caption?.text) || photo.caption };
    },
  });
}

/** The article's lead image (driver portraits), with credit. */
export function getLeadPhoto(title: string, signal?: AbortSignal): Promise<Loaded<Photo | null>> {
  return loadWithCache<Photo | null>({
    key: `wiki:lead:${title}`,
    ttlMs: 7 * DAY_MS,
    fetcher: async () => {
      const summary = await getWikiSummary(title, signal);
      const file = fileTitleFromUploadUrl(summary.data.original?.source);
      if (!file || !/\.(jpe?g|png|webp)$/i.test(file)) return null;
      return getCommonsImage(file, 640, signal);
    },
  });
}

const FEATURED_CATEGORY = 'Category:Featured pictures of automobiles';

/** Stable day number (UTC) for daily rotations. */
export function dayIndex(date: Date = new Date()): number {
  return Math.floor(date.getTime() / DAY_MS);
}

/** One of Commons' featured automobile photographs, rotating daily. */
export function getDailyFeaturedCar(day: number, signal?: AbortSignal): Promise<Loaded<Photo | null>> {
  return loadWithCache<Photo | null>({
    key: `commons:featured-car:${day}`,
    ttlMs: 2 * DAY_MS,
    fetcher: async () => {
      const list = await loadWithCache<string[]>({
        key: 'commons:featured-cars',
        ttlMs: 7 * DAY_MS,
        fetcher: async () => {
          const params = new URLSearchParams({
            action: 'query',
            format: 'json',
            origin: '*',
            list: 'categorymembers',
            cmtitle: FEATURED_CATEGORY,
            cmtype: 'file',
            cmlimit: '500',
          });
          const data = await getJson<{ query?: { categorymembers?: Array<{ title: string }> } }>(`${COMMONS_API}?${params}`, signal);
          return (data.query?.categorymembers ?? []).map((m) => m.title).filter((t) => /\.jpe?g$/i.test(t));
        },
      });
      const files = list.data;
      if (!files.length) return null;
      // A fixed permutation so consecutive days don't walk the alphabet.
      const pick = files[(day * 37) % files.length];
      return getCommonsImage(pick, 1400, signal);
    },
  });
}
