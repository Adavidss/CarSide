/**
 * Open-Meteo geocoding — fallback when Nominatim is unavailable. Place-name search only
 * (no street addresses), so the query is reduced to its first component.
 */
import { fetchJson } from '@/services/http';
import type { GeocodeResult } from './types';

interface OpenMeteoPlace {
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  country?: string;
  admin1?: string;
  postcodes?: string[];
}

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

const STATE_CODES = Object.fromEntries(Object.entries(US_STATES).map(([code, name]) => [name.toLowerCase(), code]));

export async function searchOpenMeteo(query: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const parts = query.split(',').map((p) => p.trim()).filter(Boolean);
  const name = parts[0]?.replace(/\b\d{5}\b/g, '').trim();
  if (!name) return null;
  const stateToken = parts[1]?.replace(/\b\d{5}\b/g, '').trim().toUpperCase();
  const wantedState = stateToken ? (US_STATES[stateToken] ?? parts[1]?.trim()) : undefined;

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=en&format=json`;
  const data = await fetchJson<{ results?: OpenMeteoPlace[] }>(url, { signal, timeoutMs: 10_000 });
  const results = data.results ?? [];
  if (!results.length) return null;

  const hit =
    (wantedState && results.find((r) => r.admin1?.toLowerCase() === wantedState.toLowerCase())) ||
    results.find((r) => r.country_code === 'US') ||
    results[0];

  const region =
    hit.country_code === 'US' && hit.admin1 ? (STATE_CODES[hit.admin1.toLowerCase()] ?? hit.admin1) : (hit.admin1 ?? hit.country);
  const postcode = query.match(/\b\d{5}\b/)?.[0];
  const label = [hit.name, region].filter(Boolean).join(', ') + (postcode ? ` ${postcode}` : '');
  return { label, latitude: hit.latitude, longitude: hit.longitude, provider: 'open-meteo' };
}
