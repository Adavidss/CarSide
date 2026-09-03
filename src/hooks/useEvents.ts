import { useEffect, useState } from 'react';
import type { EventSearchResult, EventWithDistance } from '@/models/events';
import { findEventById, searchEvents } from '@/services/events/registry';
import { DAY_MS } from '@/utils/dates';
import { useSaved } from './useSaved';
import { useSettings } from './useSettings';

export interface EventsResource {
  status: 'loading' | 'ready' | 'error';
  data?: EventSearchResult;
  error?: string;
}

/** Events near the selected location whose start falls in [from, to]. */
export function useNearbyEvents(from: Date, to: Date, radiusOverride?: number): EventsResource {
  const { settings } = useSettings();
  const { latitude, longitude } = settings.location;
  const radiusMiles = radiusOverride ?? settings.radiusMiles;
  const [state, setState] = useState<EventsResource>({ status: 'loading' });
  const fromMs = from.getTime();
  const toMs = to.getTime();

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    searchEvents({ latitude, longitude, radiusMiles, from: new Date(fromMs), to: new Date(toMs), signal: controller.signal })
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [latitude, longitude, radiusMiles, fromMs, toMs]);

  return state;
}

export interface EventLookup {
  status: 'loading' | 'ready';
  event?: EventWithDistance;
}

/** Resolve one event id — from providers first, then from the saved list. */
export function useEventById(id: string | undefined): EventLookup {
  const { settings } = useSettings();
  const { saved } = useSaved();
  const { latitude, longitude } = settings.location;
  const [state, setState] = useState<EventLookup>({ status: 'loading' });

  useEffect(() => {
    if (!id) {
      setState({ status: 'ready', event: undefined });
      return;
    }
    let cancelled = false;
    const now = Date.now();
    findEventById(id, {
      latitude,
      longitude,
      radiusMiles: Number.POSITIVE_INFINITY,
      from: new Date(now - 30 * DAY_MS),
      to: new Date(now + 400 * DAY_MS),
    })
      .then((event) => {
        if (cancelled) return;
        if (event) {
          setState({ status: 'ready', event });
          return;
        }
        const fallback = saved.find((s) => s.event.id === id)?.event;
        setState({ status: 'ready', event: fallback });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'ready', event: saved.find((s) => s.event.id === id)?.event });
      });
    return () => {
      cancelled = true;
    };
    // `saved` is only a fallback; re-running on every save toggle is unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, latitude, longitude]);

  return state;
}
