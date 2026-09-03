/**
 * Geocoding orchestrator: ZIP → Zippopotam, otherwise Nominatim, with Open-Meteo as a
 * fallback. Results are cached indefinitely per normalised query.
 */
import type { UserLocation } from '@/models/location';
import { readCache, writeCache } from '@/services/cache';
import { searchNominatim, reverseNominatim } from './nominatim';
import { searchOpenMeteo } from './openMeteoGeocoder';
import { searchZip } from './zippopotam';
import { GeocodeError, type GeocodeResult } from './types';

export { GeocodeError } from './types';

function normalize(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

export async function geocode(query: string, signal?: AbortSignal): Promise<UserLocation> {
  const cleaned = query.trim().replace(/\s+/g, ' ');
  if (cleaned.length < 2) throw new GeocodeError('Enter a city, a ZIP code, or "City, ST".');

  const cacheKey = `geocode:${normalize(cleaned)}`;
  const cached = readCache<GeocodeResult>(cacheKey);
  if (cached) return { ...cached.value, source: 'geocoded' };

  const attempts: Array<() => Promise<GeocodeResult | null>> = [];
  if (/^\d{5}$/.test(cleaned)) attempts.push(() => searchZip(cleaned, signal));
  attempts.push(() => searchNominatim(cleaned, signal));
  attempts.push(() => searchOpenMeteo(cleaned, signal));

  let lastError: unknown;
  let sawEmptyResult = false;
  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result) {
        writeCache(cacheKey, result);
        return { ...result, source: 'geocoded' };
      }
      sawEmptyResult = true;
    } catch (err) {
      lastError = err;
    }
  }
  if (sawEmptyResult) {
    throw new GeocodeError(`We couldn't find "${cleaned}". Try "City, ST" or a 5-digit ZIP code.`);
  }
  throw new GeocodeError(
    lastError instanceof Error && /abort|timed out/i.test(lastError.message)
      ? 'Location lookup timed out. Check your connection and try again.'
      : 'Location services are unreachable right now. Your current location is unchanged.',
  );
}

export async function reverseGeocode(latitude: number, longitude: number, signal?: AbortSignal): Promise<string> {
  const cacheKey = `reverse:${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const cached = readCache<string>(cacheKey);
  if (cached) return cached.value;
  try {
    const label = await reverseNominatim(latitude, longitude, signal);
    if (label) {
      writeCache(cacheKey, label);
      return label;
    }
  } catch {
    // fall through to a coordinate label
  }
  return `${Math.abs(latitude).toFixed(3)}° ${latitude >= 0 ? 'N' : 'S'}, ${Math.abs(longitude).toFixed(3)}° ${longitude >= 0 ? 'E' : 'W'}`;
}
