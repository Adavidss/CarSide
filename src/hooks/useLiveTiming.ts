/**
 * Live timing state machine for a session in OpenF1's live window. Polls incrementally:
 * positions / intervals / GPS every ~6 s, laps / stints / pits / race control / weather /
 * team radio every ~24 s — about 45 requests a minute, inside the supporter limit of 60.
 * All requests share one spaced queue so the two cycles never burst past the per-second cap.
 *
 * `simulate` replays a finished session through the same code path (free tier, no token)
 * by pretending "now" is a moving point inside that session — used to test the screen
 * between race weekends.
 */
import { useEffect, useRef, useState } from 'react';
import type { OpenF1Auth } from '@/models/settings';
import {
  buildTrace,
  classifyRaceControl,
  findLiveSession,
  flagStateAt,
  isNotableControl,
  MAX_LAP_MS,
  ms,
  openf1Get,
  OpenF1Error,
  projectPoint,
  q,
  toDrivers,
  type OpenF1Interval,
  type OpenF1Lap,
  type OpenF1Location,
  type OpenF1Pit,
  type OpenF1Position,
  type OpenF1RaceControl,
  type OpenF1Radio,
  type OpenF1Session,
  type OpenF1Stint,
  type OpenF1Weather,
  type ReplayDriver,
  type ReplayEventKind,
  type TrackTrace,
} from '@/services/f1/openf1';
import { MINUTE_MS } from '@/utils/dates';

export interface LiveRow {
  driver: ReplayDriver;
  position: number | null;
  gapToLeader: number | string | null;
  interval: number | string | null;
  lastLap: number | null;
  bestLap: number | null;
  /** 24 mini-sector codes of the last completed lap (3 sectors × up to 8). */
  segments: number[];
  compound: string | null;
  tyreAge: number | null;
  pits: number;
  lapsDone: number;
}

export interface LiveCar {
  number: number;
  colour: string;
  code: string;
  x: number;
  y: number;
  position: number | null;
}

export interface LiveWeather {
  air: number | null;
  track: number | null;
  humidity: number | null;
  rain: boolean;
  wind: number | null;
}

export type LiveStatus = 'idle' | 'searching' | 'no-session' | 'needs-token' | 'loading' | 'live' | 'error';

export interface LiveState {
  status: LiveStatus;
  session?: OpenF1Session;
  rows: LiveRow[];
  cars: LiveCar[];
  trace: TrackTrace | null;
  leaderLap: number;
  flag: { kind: ReplayEventKind | 'clear'; message: string | null };
  control: Array<{ t: number; lap: number | null; category: string; message: string }>;
  weather: LiveWeather | null;
  radio: Array<{ t: number; driver: number; url: string }>;
  updatedAt: number | null;
  error?: string;
  simulated: boolean;
}

export interface LiveOptions {
  auth: OpenF1Auth | null;
  /** Poll only while true (e.g. the page is visible and a session is expected). */
  enabled: boolean;
  /** Test/replay mode: session key + the historical instant to start "now" from. */
  simulate?: { sessionKey: number; startAt?: number; speed?: number };
}

// Supporter tier: 6 req/s and 60/min → ~45/min at this cadence. The free tier used by
// simulated mode allows 3 req/s and 30/min, so it runs slower and with wider spacing.
const CADENCE = {
  live: { fast: 6_000, slow: 24_000, gap: 250 },
  simulated: { fast: 12_000, slow: 30_000, gap: 450 },
} as const;

interface Store {
  session?: OpenF1Session;
  drivers: Map<number, ReplayDriver>;
  laps: Map<string, OpenF1Lap>; // `${driver}-${lap}`
  positions: Map<number, OpenF1Position>;
  intervals: Map<number, OpenF1Interval>;
  stints: OpenF1Stint[];
  pits: OpenF1Pit[];
  control: OpenF1RaceControl[];
  events: Array<{ t: number; lap: number | null; kind: ReplayEventKind; message: string }>;
  weather: OpenF1Weather | null;
  radio: OpenF1Radio[];
  locations: Map<number, OpenF1Location>;
  trace: TrackTrace | null;
  traceTried: number;
  cursors: { position?: string; interval?: string; control?: string; radio?: string; lapsFull: boolean };
}

function emptyStore(): Store {
  return {
    drivers: new Map(),
    laps: new Map(),
    positions: new Map(),
    intervals: new Map(),
    stints: [],
    pits: [],
    control: [],
    events: [],
    weather: null,
    radio: [],
    locations: new Map(),
    trace: null,
    traceTried: 0,
    cursors: { lapsFull: false },
  };
}

const initialState: LiveState = {
  status: 'idle',
  rows: [],
  cars: [],
  trace: null,
  leaderLap: 0,
  flag: { kind: 'clear', message: null },
  control: [],
  weather: null,
  radio: [],
  updatedAt: null,
  simulated: false,
};

function deriveState(store: Store, now: number, simulated: boolean): LiveState {
  const drivers = [...store.drivers.values()];
  const rows: LiveRow[] = drivers.map((driver) => {
    const laps = [...store.laps.values()].filter((l) => l.driver_number === driver.number).sort((a, b) => a.lap_number - b.lap_number);
    const completed = laps.filter((l) => l.lap_duration != null && l.lap_duration * 1000 < MAX_LAP_MS);
    const last = completed[completed.length - 1];
    const best = completed.filter((l) => !l.is_pit_out_lap && l.lap_number > 1).reduce<OpenF1Lap | null>((acc, l) => (acc === null || (l.lap_duration ?? Infinity) < (acc.lap_duration ?? Infinity) ? l : acc), null);
    const lapsDone = laps.length ? Math.max(...laps.map((l) => l.lap_number)) : 0;
    const stint = store.stints.filter((s) => s.driver_number === driver.number).sort((a, b) => a.stint_number - b.stint_number).find((s) => lapsDone >= s.lap_start && (s.lap_end == null || lapsDone <= s.lap_end)) ?? store.stints.filter((s) => s.driver_number === driver.number).at(-1);
    return {
      driver,
      position: store.positions.get(driver.number)?.position ?? null,
      gapToLeader: store.intervals.get(driver.number)?.gap_to_leader ?? null,
      interval: store.intervals.get(driver.number)?.interval ?? null,
      lastLap: last?.lap_duration != null ? last.lap_duration * 1000 : null,
      bestLap: best?.lap_duration != null ? best.lap_duration * 1000 : null,
      segments: last ? [...(last.segments_sector_1 ?? []), ...(last.segments_sector_2 ?? []), ...(last.segments_sector_3 ?? [])] : [],
      compound: stint?.compound ?? null,
      tyreAge: stint ? Math.max(0, lapsDone - stint.lap_start) + (stint.tyre_age_at_start ?? 0) : null,
      pits: store.pits.filter((p) => p.driver_number === driver.number).length,
      lapsDone,
    };
  });
  rows.sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

  const cars: LiveCar[] = [];
  if (store.trace) {
    for (const [num, loc] of store.locations) {
      const driver = store.drivers.get(num);
      if (!driver || (loc.x === 0 && loc.y === 0)) continue;
      const [x, y] = projectPoint(store.trace, loc.x, loc.y);
      cars.push({ number: num, colour: driver.colour, code: driver.code, x, y, position: store.positions.get(num)?.position ?? null });
    }
  }

  const weather = store.weather
    ? { air: store.weather.air_temperature, track: store.weather.track_temperature, humidity: store.weather.humidity, rain: (store.weather.rainfall ?? 0) > 0, wind: store.weather.wind_speed }
    : null;

  return {
    status: 'live',
    session: store.session,
    rows,
    cars,
    trace: store.trace,
    leaderLap: rows.reduce((m, r) => Math.max(m, r.lapsDone), 0),
    flag: flagStateAt(store.events, now),
    control: store.control
      .slice(-12)
      .reverse()
      .map((rc) => ({ t: ms(rc.date), lap: rc.lap_number, category: rc.category, message: rc.message })),
    weather,
    radio: store.radio
      .slice(-6)
      .reverse()
      .map((r) => ({ t: ms(r.date), driver: r.driver_number, url: r.recording_url })),
    updatedAt: Date.now(),
    simulated,
  };
}

export function useLiveTiming({ auth, enabled, simulate }: LiveOptions): LiveState {
  const [state, setState] = useState<LiveState>(initialState);
  const storeRef = useRef<Store>(emptyStore());
  const token = simulate ? undefined : auth?.token;

  useEffect(() => {
    if (!enabled) {
      setState(initialState);
      return;
    }
    const store = emptyStore();
    storeRef.current = store;
    const controller = new AbortController();
    const signal = controller.signal;
    let cancelled = false;
    let fastTimer: number | undefined;
    let slowTimer: number | undefined;
    let backoff = 1;
    const mountedAt = Date.now();
    const speed = simulate?.speed ?? 1;
    let simStart = simulate?.startAt ?? 0;
    const virtualNow = () => (simulate ? simStart + (Date.now() - mountedAt) * speed : Date.now());
    const iso = (t: number) => new Date(t).toISOString();
    const opts = { token, signal };
    const cadence = simulate ? CADENCE.simulated : CADENCE.live;
    // Every request goes through one queue with a fixed gap, so overlapping cycles never burst.
    let chain: Promise<unknown> = Promise.resolve();
    const run = <T,>(fn: () => Promise<T>): Promise<T> => {
      const next = chain.then(async () => {
        const result = await fn();
        await new Promise((resolve) => window.setTimeout(resolve, cadence.gap));
        return result;
      });
      chain = next.catch(() => undefined);
      return next;
    };
    // Simulation adds an upper bound so we never read "the future" of a finished session.
    const upper = () => (simulate ? `&date<=${q(iso(virtualNow()))}` : '');
    const upperLaps = () => (simulate ? `&date_start<=${q(iso(virtualNow()))}` : '');

    const fail = (err: unknown) => {
      if (cancelled) return;
      const e = err instanceof OpenF1Error ? err : new OpenF1Error(err instanceof Error ? err.message : String(err));
      if (e.needsToken) {
        setState((prev) => ({ ...prev, status: 'needs-token', error: e.message }));
        stop();
        return;
      }
      if (e.rateLimited) backoff = Math.min(4, backoff * 2);
      setState((prev) => ({ ...prev, status: prev.rows.length ? 'live' : 'error', error: e.message }));
    };

    const stop = () => {
      if (fastTimer) window.clearTimeout(fastTimer);
      if (slowTimer) window.clearTimeout(slowTimer);
    };

    const publish = () => {
      if (cancelled || !store.session) return;
      setState(deriveState(store, virtualNow(), Boolean(simulate)));
    };

    const fastCycle = async () => {
      if (cancelled || !store.session) return;
      const key = store.session.session_key;
      try {
        const posQuery = store.cursors.position ? `&date>${q(store.cursors.position)}` : '';
        const positions = await run(() => openf1Get<OpenF1Position>(`/position?session_key=${key}${posQuery}${upper()}`, opts));
        for (const p of positions) {
          const prev = store.positions.get(p.driver_number);
          if (!prev || ms(p.date) >= ms(prev.date)) store.positions.set(p.driver_number, p);
          if (!store.cursors.position || p.date > store.cursors.position) store.cursors.position = p.date;
        }
        const intQuery = store.cursors.interval ? `&date>${q(store.cursors.interval)}` : `&date>=${q(iso(virtualNow() - 3 * MINUTE_MS))}`;
        const intervals = await run(() => openf1Get<OpenF1Interval>(`/intervals?session_key=${key}${intQuery}${upper()}`, opts));
        for (const i of intervals) {
          const prev = store.intervals.get(i.driver_number);
          if (!prev || ms(i.date) >= ms(prev.date)) store.intervals.set(i.driver_number, i);
          if (!store.cursors.interval || i.date > store.cursors.interval) store.cursors.interval = i.date;
        }
        if (store.trace) {
          const from = iso(virtualNow() - 5_000);
          const locations = await run(() => openf1Get<OpenF1Location>(`/location?session_key=${key}&date>=${q(from)}${upper()}`, opts));
          for (const l of locations) {
            const prev = store.locations.get(l.driver_number);
            if (!prev || ms(l.date) >= ms(prev.date)) store.locations.set(l.driver_number, l);
          }
        }
        backoff = 1;
        publish();
      } catch (err) {
        fail(err);
      } finally {
        if (!cancelled) fastTimer = window.setTimeout(fastCycle, cadence.fast * backoff);
      }
    };

    const slowCycle = async () => {
      if (cancelled || !store.session) return;
      const key = store.session.session_key;
      try {
        const lapQuery = store.cursors.lapsFull ? `&date_start>=${q(iso(virtualNow() - 6 * MINUTE_MS))}` : '';
        const laps = await run(() => openf1Get<OpenF1Lap>(`/laps?session_key=${key}${lapQuery}${upperLaps()}`, opts));
        for (const l of laps) store.laps.set(`${l.driver_number}-${l.lap_number}`, l);
        store.cursors.lapsFull = true;

        store.stints = await run(() => openf1Get<OpenF1Stint>(`/stints?session_key=${key}`, opts));
        store.pits = (await run(() => openf1Get<OpenF1Pit>(`/pit?session_key=${key}${upper()}`, opts)).catch(() => store.pits)) ?? store.pits;

        const rcQuery = store.cursors.control ? `&date>${q(store.cursors.control)}` : '';
        const control = await run(() => openf1Get<OpenF1RaceControl>(`/race_control?session_key=${key}${rcQuery}${upper()}`, opts)).catch(() => [] as OpenF1RaceControl[]);
        for (const rc of control) {
          if (isNotableControl(rc)) store.control.push(rc);
          const kind = classifyRaceControl(rc);
          if (kind) store.events.push({ t: ms(rc.date), lap: rc.lap_number, kind, message: rc.message });
          if (!store.cursors.control || rc.date > store.cursors.control) store.cursors.control = rc.date;
        }
        store.events.sort((a, b) => a.t - b.t);

        const weather = await run(() => openf1Get<OpenF1Weather>(`/weather?session_key=${key}&date>=${q(iso(virtualNow() - 15 * MINUTE_MS))}${upper()}`, opts)).catch(() => [] as OpenF1Weather[]);
        if (weather.length) store.weather = weather[weather.length - 1];

        const radioQuery = store.cursors.radio ? `&date>${q(store.cursors.radio)}` : `&date>=${q(iso(virtualNow() - 40 * MINUTE_MS))}`;
        const radio = await run(() => openf1Get<OpenF1Radio>(`/team_radio?session_key=${key}${radioQuery}${upper()}`, opts)).catch(() => [] as OpenF1Radio[]);
        for (const r of radio) {
          store.radio.push(r);
          if (!store.cursors.radio || r.date > store.cursors.radio) store.cursors.radio = r.date;
        }

        // Track trace: first completed lap of whoever leads, fetched once (retry every few cycles).
        if (!store.trace && store.traceTried % 3 === 0) {
          const leader = [...store.positions.values()].sort((a, b) => a.position - b.position)[0]?.driver_number;
          const candidates = [...store.laps.values()]
            .filter((l) => l.date_start && l.lap_duration && !l.is_pit_out_lap && (leader === undefined || l.driver_number === leader))
            .sort((a, b) => a.lap_number - b.lap_number);
          const refLap = candidates.find((l) => l.lap_number >= 2) ?? candidates[0];
          if (refLap) store.trace = await run(() => buildTrace(key, refLap.driver_number, refLap, opts)).catch(() => null);
        }
        store.traceTried += 1;
        backoff = 1;
        publish();
      } catch (err) {
        fail(err);
      } finally {
        if (!cancelled) slowTimer = window.setTimeout(slowCycle, cadence.slow * backoff);
      }
    };

    (async () => {
      try {
        setState({ ...initialState, status: 'searching', simulated: Boolean(simulate) });
        let session: OpenF1Session | undefined;
        if (simulate) {
          session = (await run(() => openf1Get<OpenF1Session>(`/sessions?session_key=${simulate.sessionKey}`, { signal })))[0];
        } else {
          session = await run(() => findLiveSession(Date.now(), signal));
        }
        if (cancelled) return;
        if (!session) {
          setState({ ...initialState, status: 'no-session' });
          return;
        }
        if (!simulate && !token) {
          setState({ ...initialState, status: 'needs-token', session });
          return;
        }
        store.session = session;
        if (simulate && !simulate.startAt) simStart = ms(session.date_start) + 5 * MINUTE_MS;
        setState({ ...initialState, status: 'loading', session, simulated: Boolean(simulate) });
        const drivers = toDrivers(await run(() => openf1Get(`/drivers?session_key=${session.session_key}`, opts)));
        for (const d of drivers) store.drivers.set(d.number, d);
        await slowCycle();
        await fastCycle();
      } catch (err) {
        fail(err);
      }
    })();

    return () => {
      cancelled = true;
      stop();
      controller.abort();
    };
  }, [enabled, token, simulate?.sessionKey, simulate?.startAt, simulate?.speed]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
