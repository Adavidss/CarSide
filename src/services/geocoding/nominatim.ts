/**
 * OpenStreetMap Nominatim — public, CORS-enabled, no key. Usage policy asks for
 * light traffic (≤1 req/s) and identification, which the browser's Referer provides.
 */
import { fetchJson } from '@/services/http';
import type { GeocodeResult } from './types';

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
  'ISO3166-2-lvl4'?: string;
}

interface NominatimPlace {
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
}

const BASE = 'https://nominatim.openstreetmap.org';

function labelFrom(address: NominatimAddress | undefined, fallback: string, postcodeHint?: string): string {
  if (!address) return fallback;
  const place = address.city ?? address.town ?? address.village ?? address.hamlet ?? address.municipality ?? address.county;
  const iso = address['ISO3166-2-lvl4'];
  const regionCode = iso && iso.includes('-') ? iso.split('-')[1] : undefined;
  const isUs = address.country_code === 'us';
  const region = isUs && regionCode ? regionCode : (address.state ?? address.country);
  const postcode = postcodeHint ?? undefined;
  if (place && region) return postcode ? `${place}, ${region} ${postcode}` : `${place}, ${region}`;
  if (place) return place;
  return fallback;
}

export async function searchNominatim(query: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const url = `${BASE}/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=1&addressdetails=1`;
  const results = await fetchJson<NominatimPlace[]>(url, { signal, timeoutMs: 10_000 });
  const hit = results[0];
  if (!hit) return null;
  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const postcodeHint = query.match(/\b\d{5}\b/)?.[0];
  return {
    label: labelFrom(hit.address, hit.display_name.split(',').slice(0, 2).join(',').trim(), postcodeHint),
    latitude,
    longitude,
    provider: 'nominatim',
  };
}

export async function reverseNominatim(latitude: number, longitude: number, signal?: AbortSignal): Promise<string | null> {
  const url = `${BASE}/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&zoom=10&addressdetails=1`;
  const hit = await fetchJson<NominatimPlace>(url, { signal, timeoutMs: 10_000 });
  if (!hit?.address) return null;
  return labelFrom(hit.address, hit.display_name?.split(',').slice(0, 2).join(',').trim() ?? '');
}
