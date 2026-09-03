/**
 * Open-Meteo hourly forecasts — public, CORS-enabled, no key.
 * Locations are batched into one request and cached per rounded coordinate.
 */
import type { GeoPoint } from '@/models/location';
import type { WeatherKind, WeatherSnapshot, WeatherVerdict } from '@/models/weather';
import { appConfig } from '@/config/appConfig';
import { readCache, writeCache } from '@/services/cache';
import { fetchJson } from '@/services/http';
import { HOUR_MS } from '@/utils/dates';

export interface HourlyForecast {
  /** Epoch milliseconds for every hourly slot. */
  times: number[];
  temperatureF: number[];
  precipitationProbability: number[];
  weatherCode: number[];
}

interface OpenMeteoLocation {
  hourly: {
    time: number[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
  };
}

const TTL = HOUR_MS;

/** One quiet retry — Open-Meteo occasionally returns a transient 5xx. */
async function fetchForecastJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  try {
    return await fetchJson<T>(url, { signal, timeoutMs: 10_000 });
  } catch (err) {
    if (signal?.aborted) throw err;
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    return fetchJson<T>(url, { signal, timeoutMs: 10_000 });
  }
}

/** Group nearby events into one forecast point (~1 km grid). */
export function forecastKey(point: GeoPoint): string {
  return `${point.latitude.toFixed(2)},${point.longitude.toFixed(2)}`;
}

function toForecast(location: OpenMeteoLocation): HourlyForecast {
  return {
    times: location.hourly.time.map((t) => t * 1000),
    temperatureF: location.hourly.temperature_2m,
    precipitationProbability: location.hourly.precipitation_probability,
    weatherCode: location.hourly.weather_code,
  };
}

/** Resolve forecasts for many points, hitting the network only for uncached keys. */
export async function getForecasts(points: GeoPoint[], signal?: AbortSignal): Promise<Map<string, HourlyForecast>> {
  const result = new Map<string, HourlyForecast>();
  const missing = new Map<string, GeoPoint>();

  for (const point of points) {
    const key = forecastKey(point);
    if (result.has(key) || missing.has(key)) continue;
    const cached = readCache<HourlyForecast>(`weather:${key}`);
    if (cached && Date.now() - cached.savedAt < TTL) result.set(key, cached.value);
    else missing.set(key, point);
  }

  if (missing.size) {
    const keys = [...missing.keys()];
    const lats = keys.map((k) => missing.get(k)!.latitude.toFixed(3)).join(',');
    const lons = keys.map((k) => missing.get(k)!.longitude.toFixed(3)).join(',');
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
      `&hourly=temperature_2m,precipitation_probability,weather_code` +
      `&temperature_unit=fahrenheit&timeformat=unixtime&timezone=UTC&forecast_days=${appConfig.weatherForecastDays}`;
    try {
      const data = await fetchForecastJson<OpenMeteoLocation | OpenMeteoLocation[]>(url, signal);
      const list = Array.isArray(data) ? data : [data];
      list.forEach((location, index) => {
        const key = keys[index];
        if (!key || !location?.hourly) return;
        const forecast = toForecast(location);
        writeCache(`weather:${key}`, forecast);
        result.set(key, forecast);
      });
    } catch {
      // Fall back to stale cache for whatever we have; weather is decorative.
      for (const key of keys) {
        const cached = readCache<HourlyForecast>(`weather:${key}`);
        if (cached) result.set(key, cached.value);
      }
    }
  }
  return result;
}

export function describeWeatherCode(code: number): { kind: WeatherKind; label: string } {
  if (code === 0) return { kind: 'clear', label: 'Clear' };
  if (code === 1) return { kind: 'clear', label: 'Mostly clear' };
  if (code === 2) return { kind: 'partly', label: 'Partly cloudy' };
  if (code === 3) return { kind: 'cloud', label: 'Overcast' };
  if (code === 45 || code === 48) return { kind: 'fog', label: 'Fog' };
  if (code >= 51 && code <= 57) return { kind: 'drizzle', label: 'Drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { kind: 'rain', label: 'Rain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: 'snow', label: 'Snow' };
  if (code >= 95) return { kind: 'storm', label: 'Thunderstorms' };
  return { kind: 'cloud', label: 'Cloudy' };
}

/** Snapshot for the hour nearest `when`, or null when outside the forecast horizon. */
export function snapshotAt(forecast: HourlyForecast, when: Date): WeatherSnapshot | null {
  const target = when.getTime();
  if (!forecast.times.length) return null;
  if (target < forecast.times[0] - HOUR_MS || target > forecast.times[forecast.times.length - 1] + HOUR_MS) return null;
  let best = 0;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let i = 0; i < forecast.times.length; i++) {
    const diff = Math.abs(forecast.times[i] - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  const code = forecast.weatherCode[best];
  const temp = forecast.temperatureF[best];
  if (code == null || temp == null) return null;
  const { kind, label } = describeWeatherCode(code);
  return {
    time: forecast.times[best],
    temperatureF: Math.round(temp),
    precipitationProbability: forecast.precipitationProbability[best] ?? 0,
    weatherCode: code,
    kind,
    label,
  };
}

/** Peak rain chance across a window (e.g. the whole event), for "rain likely" verdicts. */
export function maxPrecipitationProbability(forecast: HourlyForecast, start: Date, end: Date): number {
  let max = 0;
  for (let i = 0; i < forecast.times.length; i++) {
    const t = forecast.times[i];
    if (t >= start.getTime() - HOUR_MS && t <= end.getTime()) {
      max = Math.max(max, forecast.precipitationProbability[i] ?? 0);
    }
  }
  return max;
}

export function weatherVerdict(snapshot: WeatherSnapshot, precipitationWindowMax?: number): WeatherVerdict {
  const rain = Math.max(snapshot.precipitationProbability, precipitationWindowMax ?? 0);
  if (snapshot.kind === 'storm') return { label: 'Storms likely', tone: 'bad' };
  if (snapshot.kind === 'snow') return { label: 'Snow', tone: 'bad' };
  if (rain >= 55 || snapshot.kind === 'rain') return { label: 'Rain likely', tone: 'bad' };
  if (rain >= 30 || snapshot.kind === 'drizzle') return { label: 'Rain possible', tone: 'warn' };
  if (snapshot.temperatureF >= 95) return { label: 'Hot one', tone: 'warn' };
  if (snapshot.temperatureF <= 38) return { label: 'Bundle up', tone: 'warn' };
  if (snapshot.kind === 'fog') return { label: 'Foggy start', tone: 'warn' };
  return { label: 'Good show weather', tone: 'ok' };
}

/* ---------- daily outlook (weekend planning) ---------- */

export interface DailyOutlook {
  /** Local calendar date "YYYY-MM-DD". */
  date: string;
  code: number;
  kind: WeatherKind;
  label: string;
  high: number;
  low: number;
  precipitationProbability: number;
}

interface OpenMeteoDaily {
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: Array<number | null>;
  };
}

/** Seven-day daily forecast for a point, cached for an hour. */
export async function getDailyOutlook(point: GeoPoint, signal?: AbortSignal): Promise<DailyOutlook[]> {
  const key = `weather:daily:${forecastKey(point)}`;
  const cached = readCache<DailyOutlook[]>(key);
  if (cached && Date.now() - cached.savedAt < TTL) return cached.value;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${point.latitude.toFixed(3)}&longitude=${point.longitude.toFixed(3)}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`;
  try {
    const data = await fetchForecastJson<OpenMeteoDaily>(url, signal);
    const days = data.daily.time.map((date, i) => {
      const code = data.daily.weather_code[i] ?? 3;
      const { kind, label } = describeWeatherCode(code);
      return {
        date,
        code,
        kind,
        label,
        high: Math.round(data.daily.temperature_2m_max[i]),
        low: Math.round(data.daily.temperature_2m_min[i]),
        precipitationProbability: data.daily.precipitation_probability_max[i] ?? 0,
      };
    });
    writeCache(key, days);
    return days;
  } catch (err) {
    if (cached) return cached.value;
    throw err;
  }
}

/** A dry, mild day — the kind you take the roof off for. */
export function isTopDownDay(day: DailyOutlook): boolean {
  return day.high >= 62 && day.high <= 88 && day.precipitationProbability <= 20 && !['rain', 'drizzle', 'storm', 'snow'].includes(day.kind);
}
