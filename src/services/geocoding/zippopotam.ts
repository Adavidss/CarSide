/**
 * Zippopotam.us — fast, key-free US ZIP lookups (CORS-enabled).
 */
import { fetchJson } from '@/services/http';
import type { GeocodeResult } from './types';

interface ZippopotamResponse {
  'post code': string;
  places: Array<{
    'place name': string;
    'state abbreviation': string;
    latitude: string;
    longitude: string;
  }>;
}

export async function searchZip(zip: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const data = await fetchJson<ZippopotamResponse>(`https://api.zippopotam.us/us/${zip}`, { signal, timeoutMs: 8_000 });
  const place = data.places?.[0];
  if (!place) return null;
  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    label: `${place['place name']}, ${place['state abbreviation']} ${data['post code']}`,
    latitude,
    longitude,
    provider: 'zippopotam',
  };
}
