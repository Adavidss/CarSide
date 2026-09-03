import { useEffect, useMemo, useState } from 'react';
import { appConfig } from '@/config/appConfig';
import type { CarEvent } from '@/models/events';
import type { GeoPoint } from '@/models/location';
import type { WeatherSnapshot, WeatherVerdict } from '@/models/weather';
import {
  forecastKey,
  getDailyOutlook,
  getForecasts,
  maxPrecipitationProbability,
  snapshotAt,
  weatherVerdict,
  type DailyOutlook,
  type HourlyForecast,
} from '@/services/weather/openMeteo';
import { DAY_MS, HOUR_MS } from '@/utils/dates';

export interface EventWeather {
  snapshot: WeatherSnapshot;
  verdict: WeatherVerdict;
}

function horizonEnd(): number {
  return Date.now() + appConfig.weatherForecastDays * DAY_MS;
}

/** Point used for an event's forecast; sunrise-hour default for date-only events. */
function eventForecastTime(event: CarEvent): Date {
  const start = new Date(event.start);
  if (event.allDay || event.timeTbd) {
    // Date-only entries sit at local midnight; look at late morning instead.
    return new Date(start.getTime() + 10 * HOUR_MS);
  }
  return start;
}

function eventEndTime(event: CarEvent, start: Date): Date {
  if (event.end && !event.allDay) return new Date(event.end);
  return new Date(start.getTime() + 3 * HOUR_MS);
}

/** Forecast at each event's start, for events inside the forecast horizon. */
export function useEventWeather(events: CarEvent[]): Map<string, EventWeather> {
  const [forecasts, setForecasts] = useState<Map<string, HourlyForecast>>(new Map());
  const limit = horizonEnd();

  const eligible = useMemo(
    () =>
      events.filter(
        (e) =>
          e.latitude != null &&
          e.longitude != null &&
          new Date(e.start).getTime() <= limit &&
          new Date(e.end ?? e.start).getTime() >= Date.now() - HOUR_MS,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events.map((e) => e.id).join('|')],
  );

  const pointsKey = useMemo(
    () =>
      [...new Set(eligible.map((e) => forecastKey({ latitude: e.latitude!, longitude: e.longitude! })))].sort().join(';'),
    [eligible],
  );

  useEffect(() => {
    if (!pointsKey) return;
    const controller = new AbortController();
    const points: GeoPoint[] = pointsKey.split(';').map((k) => {
      const [lat, lon] = k.split(',').map(Number);
      return { latitude: lat, longitude: lon };
    });
    getForecasts(points, controller.signal)
      .then((map) => {
        if (!controller.signal.aborted) setForecasts(map);
      })
      .catch(() => {
        /* weather is decorative */
      });
    return () => controller.abort();
  }, [pointsKey]);

  return useMemo(() => {
    const out = new Map<string, EventWeather>();
    for (const event of eligible) {
      const forecast = forecasts.get(forecastKey({ latitude: event.latitude!, longitude: event.longitude! }));
      if (!forecast) continue;
      const start = eventForecastTime(event);
      const snapshot = snapshotAt(forecast, start);
      if (!snapshot) continue;
      const windowMax = maxPrecipitationProbability(forecast, start, eventEndTime(event, start));
      out.set(event.id, { snapshot, verdict: weatherVerdict(snapshot, windowMax) });
    }
    return out;
  }, [eligible, forecasts]);
}

/** Forecast for a single point/time — used for the circuit on race day. */
export function usePointWeather(point: GeoPoint | undefined, when: Date | undefined): EventWeather | null {
  const [forecast, setForecast] = useState<HourlyForecast | null>(null);
  const lat = point?.latitude;
  const lon = point?.longitude;
  const whenMs = when?.getTime();

  useEffect(() => {
    if (lat == null || lon == null || whenMs == null || whenMs > horizonEnd() || whenMs < Date.now() - HOUR_MS) {
      setForecast(null);
      return;
    }
    const controller = new AbortController();
    const p = { latitude: lat, longitude: lon };
    getForecasts([p], controller.signal)
      .then((map) => {
        if (!controller.signal.aborted) setForecast(map.get(forecastKey(p)) ?? null);
      })
      .catch(() => {
        /* decorative */
      });
    return () => controller.abort();
  }, [lat, lon, whenMs]);

  return useMemo(() => {
    if (!forecast || whenMs == null) return null;
    const snapshot = snapshotAt(forecast, new Date(whenMs));
    if (!snapshot) return null;
    const windowMax = maxPrecipitationProbability(forecast, new Date(whenMs), new Date(whenMs + 2 * HOUR_MS));
    return { snapshot, verdict: weatherVerdict(snapshot, windowMax) };
  }, [forecast, whenMs]);
}

/** Daily outlook for the selected location (seven days), refreshed hourly. */
export function useDailyOutlook(point: GeoPoint | undefined): DailyOutlook[] | null {
  const [days, setDays] = useState<DailyOutlook[] | null>(null);
  const lat = point?.latitude;
  const lon = point?.longitude;
  useEffect(() => {
    if (lat == null || lon == null) {
      setDays(null);
      return;
    }
    const controller = new AbortController();
    getDailyOutlook({ latitude: lat, longitude: lon }, controller.signal)
      .then((d) => {
        if (!controller.signal.aborted) setDays(d);
      })
      .catch(() => {
        /* decorative */
      });
    return () => controller.abort();
  }, [lat, lon]);
  return days;
}
