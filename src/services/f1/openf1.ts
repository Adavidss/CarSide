/**
 * OpenF1 (https://openf1.org) — community F1 data API, CORS-enabled.
 * Sessions that have ended are free; live data (from 30 min before a session to 30 min
 * after) needs a supporter token sent as a Bearer header. This module keeps both paths
 * behind one small client: replay models for finished races, and incremental "since"
 * fetches for the live timing screen.
 */
import { HttpError } from '@/services/http';
import { loadWithCache, type Loaded } from '@/services/cache';
import { DAY_MS, HOUR_MS, MINUTE_MS } from '@/utils/dates';

const BASE = 'https://api.openf1.org/v1';
const RATE_GAP_MS = 400; // free tier: 3 requests/s, 30/min

export interface OpenF1Session {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  circuit_short_name: string;
  circuit_key?: number;
  location: string;
  country_name: string;
  year: number;
}
export interface OpenF1Driver {
  driver_number: number;
  name_acronym: string | null;
  full_name: string | null;
  team_name: string | null;
  team_colour: string | null;
}
export interface OpenF1Lap {
  driver_number: number;
  lap_number: number;
  date_start: string | null;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  segments_sector_1: number[] | null;
  segments_sector_2: number[] | null;
  segments_sector_3: number[] | null;
  is_pit_out_lap: boolean;
  st_speed?: number | null;
}
export interface OpenF1Position {
  driver_number: number;
  position: number;
  date: string;
}
export interface OpenF1Interval {
  driver_number: number;
  gap_to_leader: number | string | null;
  interval: number | string | null;
  date: string;
}
export interface OpenF1Stint {
  driver_number: number;
  stint_number: number;
  lap_start: number;
  lap_end: number | null;
  compound: string | null;
  tyre_age_at_start: number | null;
}
export interface OpenF1Pit {
  driver_number: number;
  lap_number: number;
  date: string;
  pit_duration: number | null;
  stop_duration?: number | null;
  lane_duration?: number | null;
}
export interface OpenF1RaceControl {
  date: string;
  category: string;
  flag: string | null;
  scope: string | null;
  message: string;
  lap_number: number | null;
  driver_number: number | null;
}
export interface OpenF1Location {
  driver_number: number;
  date: string;
  x: number;
  y: number;
}
export interface OpenF1Weather {
  date: string;
  air_temperature: number | null;
  track_temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
}
export interface OpenF1Radio {
  driver_number: number;
  date: string;
  recording_url: string;
}
export interface OpenF1Overtake {
  date: string;
  overtaking_driver_number: number;
  overtaken_driver_number: number;
  position: number;
}
export interface OpenF1ChampionshipDriver {
  driver_number: number;
  position_start: number | null;
  position_current: number | null;
  points_start: number | null;
  points_current: number | null;
}

export class OpenF1Error extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'OpenF1Error';
  }
  get needsToken(): boolean {
    return this.status === 401 || this.status === 403;
  }
  get rateLimited(): boolean {
    return this.status === 429;
  }
}

export interface RequestOptions {
  token?: string;
  signal?: AbortSignal;
}

export const ms = (iso: string) => new Date(iso).getTime();

/** Laps longer than this (red flags, aborted starts) are not shown as lap times. */
export const MAX_LAP_MS = 10 * 60_000;
const isoOf = (t: number) => new Date(t).toISOString();
const sleep = (delay: number) => new Promise((resolve) => window.setTimeout(resolve, delay));

/** GET an endpoint. OpenF1 answers 404 + {detail} for empty results, which we treat as []. */
export async function openf1Get<T>(path: string, options: RequestOptions = {}): Promise<T[]> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(new Error('Request timed out')), 25_000);
  const onAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const response = await fetch(`${BASE}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) },
    });
    if (response.status === 404) return [];
    if (!response.ok) {
      const detail = await response.json().then((d: { detail?: unknown }) => (typeof d?.detail === 'string' ? d.detail : '')).catch(() => '');
      throw new OpenF1Error(detail || `OpenF1 ${response.status}`, response.status);
    }
    const data = (await response.json()) as unknown;
    return Array.isArray(data) ? (data as T[]) : [];
  } catch (err) {
    if (err instanceof OpenF1Error) throw err;
    if (err instanceof HttpError) throw new OpenF1Error(err.message, err.status);
    throw new OpenF1Error(err instanceof Error ? err.message : String(err));
  } finally {
    window.clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

export const q = (value: string) => encodeURIComponent(value);

/* ============================================================================
   Sessions
   ========================================================================== */

/** Race sessions for a season, cached; used to map a Jolpica race onto an OpenF1 session key. */
export function getRaceSessions(year: string, signal?: AbortSignal): Promise<Loaded<OpenF1Session[]>> {
  return loadWithCache({
    key: `openf1:races:${year}`,
    ttlMs: 12 * HOUR_MS,
    fetcher: () => openf1Get<OpenF1Session>(`/sessions?year=${year}&session_type=Race&session_name=Race`, { signal }),
  });
}

export function matchRaceSession(sessions: OpenF1Session[], raceStartIso: string): OpenF1Session | undefined {
  const target = ms(raceStartIso);
  return sessions
    .filter((s) => Math.abs(ms(s.date_start) - target) < 36 * HOUR_MS)
    .sort((a, b) => Math.abs(ms(a.date_start) - target) - Math.abs(ms(b.date_start) - target))[0];
}

/** OpenF1 treats a session as live from 30 minutes before it starts until 30 minutes after it ends. */
export const LIVE_MARGIN_MS = 30 * MINUTE_MS;

/** Sessions around `now` (one day either side) so the live screen can find the current one. */
export async function findLiveSession(now: number, signal?: AbortSignal): Promise<OpenF1Session | undefined> {
  const year = new Date(now).getUTCFullYear();
  const from = isoOf(now - DAY_MS);
  const to = isoOf(now + DAY_MS);
  const sessions = await openf1Get<OpenF1Session>(`/sessions?year=${year}&date_start>=${q(from)}&date_start<=${q(to)}`, { signal });
  return sessions.find((s) => now >= ms(s.date_start) - LIVE_MARGIN_MS && now <= ms(s.date_end) + LIVE_MARGIN_MS);
}

/* ============================================================================
   Track trace (one reference lap of GPS points)
   ========================================================================== */

export interface TrackTrace {
  points: Array<[number, number]>;
  width: number;
  height: number;
  /** Normalisation so live GPS points can be projected into the same box. */
  frame: { minX: number; minY: number; spanY: number; scale: number };
  driver: number;
  lap: number;
}

export function projectPoint(trace: TrackTrace, x: number, y: number): [number, number] {
  const { minX, minY, spanY, scale } = trace.frame;
  return [(x - minX) * scale, (spanY - (y - minY)) * scale];
}

export async function buildTrace(sessionKey: number, driver: number, lap: OpenF1Lap, options: RequestOptions): Promise<TrackTrace | null> {
  if (!lap.date_start || !lap.lap_duration) return null;
  const from = isoOf(ms(lap.date_start));
  const to = isoOf(ms(lap.date_start) + lap.lap_duration * 1000);
  const raw = await openf1Get<OpenF1Location>(`/location?session_key=${sessionKey}&driver_number=${driver}&date>=${q(from)}&date<=${q(to)}`, options);
  const pts = raw.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && (p.x !== 0 || p.y !== 0));
  if (pts.length < 20) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX || 1;
  const spanY = Math.max(...ys) - minY || 1;
  const scale = 100 / Math.max(spanX, spanY);
  const step = Math.max(1, Math.floor(pts.length / 360));
  const points: Array<[number, number]> = [];
  for (let i = 0; i < pts.length; i += step) {
    // OpenF1's y grows northward; SVG's grows downward.
    points.push([Math.round((pts[i].x - minX) * scale * 10) / 10, Math.round((spanY - (pts[i].y - minY)) * scale * 10) / 10]);
  }
  return {
    points,
    width: Math.round(spanX * scale * 10) / 10,
    height: Math.round(spanY * scale * 10) / 10,
    frame: { minX, minY, spanY, scale },
    driver,
    lap: lap.lap_number,
  };
}

/* ============================================================================
   Replay model (finished races, free tier)
   ========================================================================== */

export type ReplayEventKind = 'sc' | 'vsc' | 'red' | 'yellow' | 'green' | 'chequered';

export interface ReplayDriver {
  number: number;
  code: string;
  name: string;
  team: string;
  colour: string;
}

export interface ReplayModel {
  version: 2;
  sessionKey: number;
  name: string;
  circuit: string;
  location: string;
  start: number;
  end: number;
  totalLaps: number;
  drivers: ReplayDriver[];
  laps: Record<number, { starts: number[]; durations: number[] }>;
  positions: Record<number, Array<[number, number]>>;
  stints: Record<number, Array<{ lapStart: number; lapEnd: number; compound: string; ageAtStart: number }>>;
  events: Array<{ t: number; lap: number | null; kind: ReplayEventKind; message: string }>;
  /** All race-control lines worth reading: [t, lap, category, message]. */
  control: Array<[number, number | null, string, string]>;
  /** [t, driver, lap, stop seconds | null] */
  pits: Array<[number, number, number, number | null]>;
  /** [t, driver, url] */
  radio: Array<[number, number, string]>;
  /** [t, overtaking, overtaken, position] */
  overtakes: Array<[number, number, number, number]>;
  /** Championship points before → after this race, per driver number. */
  swing: Record<number, { before: number; after: number; posBefore: number | null; posAfter: number | null }>;
  track: { points: Array<[number, number]>; width: number; height: number };
  reference: { driver: number; lap: number };
}

export function classifyRaceControl(rc: OpenF1RaceControl): ReplayEventKind | null {
  const msg = rc.message.toUpperCase();
  if (rc.category === 'SafetyCar') {
    if (msg.includes('VIRTUAL')) return msg.includes('ENDING') || msg.includes('END') ? 'green' : 'vsc';
    if (msg.includes('IN THIS LAP') || msg.includes('ENDING')) return 'green';
    return 'sc';
  }
  if (rc.category === 'Flag') {
    if (rc.flag === 'RED') return 'red';
    if (rc.flag === 'CHEQUERED') return 'chequered';
    if (rc.scope === 'Track' && (rc.flag === 'YELLOW' || rc.flag === 'DOUBLE YELLOW')) return 'yellow';
    if (rc.scope === 'Track' && (rc.flag === 'GREEN' || rc.flag === 'CLEAR')) return 'green';
  }
  return null;
}

/** Race-control lines that matter to a viewer (skips per-sector clear/yellow noise). */
export function isNotableControl(rc: OpenF1RaceControl): boolean {
  if (rc.category === 'Flag' && rc.scope === 'Sector') return false;
  if (rc.category === 'Drs') return false;
  return true;
}

export function toDrivers(raw: OpenF1Driver[]): ReplayDriver[] {
  return raw
    .map((d) => ({
      number: d.driver_number,
      code: d.name_acronym ?? String(d.driver_number),
      name: d.full_name ?? d.name_acronym ?? String(d.driver_number),
      team: d.team_name ?? '',
      colour: d.team_colour ? `#${d.team_colour}` : '#8a8985',
    }))
    .sort((a, b) => a.number - b.number);
}

/** Per-driver lap start times and durations (ms), with missing values back-filled. */
export function toLapTable(rawLaps: OpenF1Lap[]): { laps: ReplayModel['laps']; byDriver: Map<number, OpenF1Lap[]>; totalLaps: number } {
  const byDriver = new Map<number, OpenF1Lap[]>();
  for (const lap of rawLaps) {
    if (!byDriver.has(lap.driver_number)) byDriver.set(lap.driver_number, []);
    byDriver.get(lap.driver_number)!.push(lap);
  }
  const laps: ReplayModel['laps'] = {};
  let totalLaps = 0;
  for (const [num, list] of byDriver) {
    list.sort((a, b) => a.lap_number - b.lap_number);
    const starts: number[] = [];
    const durations: number[] = [];
    for (let i = 0; i < list.length; i++) {
      const lap = list[i];
      let start = lap.date_start ? ms(lap.date_start) : NaN;
      let duration = lap.lap_duration != null ? lap.lap_duration * 1000 : NaN;
      const next = list[i + 1];
      if (Number.isNaN(duration) && next?.date_start && !Number.isNaN(start)) duration = ms(next.date_start) - start;
      if (Number.isNaN(start) && next?.date_start && !Number.isNaN(duration)) start = ms(next.date_start) - duration;
      if (Number.isNaN(start) && next?.date_start) start = ms(next.date_start) - 95_000;
      if (Number.isNaN(duration)) duration = 95_000;
      starts.push(start);
      durations.push(duration);
      totalLaps = Math.max(totalLaps, lap.lap_number);
    }
    laps[num] = { starts, durations };
  }
  return { laps, byDriver, totalLaps };
}

async function buildModel(session: OpenF1Session, signal?: AbortSignal): Promise<ReplayModel> {
  const key = session.session_key;
  const o = { signal };
  const step = async <T,>(path: string): Promise<T[]> => {
    for (let attempt = 0; ; attempt++) {
      try {
        const out = await openf1Get<T>(path, o);
        await sleep(RATE_GAP_MS);
        return out;
      } catch (err) {
        // Free tier: 3 req/s, 30/min. Wait out a rate limit rather than caching a partial model.
        if (err instanceof OpenF1Error && err.rateLimited && attempt < 3) {
          await sleep(2_500 * (attempt + 1));
          continue;
        }
        throw err;
      }
    }
  };

  const drivers = toDrivers(await step<OpenF1Driver>(`/drivers?session_key=${key}`));
  const rawLaps = await step<OpenF1Lap>(`/laps?session_key=${key}`);
  const rawPositions = await step<OpenF1Position>(`/position?session_key=${key}`);
  const rawStints = await step<OpenF1Stint>(`/stints?session_key=${key}`);
  const rawRc = await step<OpenF1RaceControl>(`/race_control?session_key=${key}`).catch(() => [] as OpenF1RaceControl[]);
  const rawPits = await step<OpenF1Pit>(`/pit?session_key=${key}`).catch(() => [] as OpenF1Pit[]);
  const rawRadio = await step<OpenF1Radio>(`/team_radio?session_key=${key}`).catch(() => [] as OpenF1Radio[]);
  const rawOvertakes = await step<OpenF1Overtake>(`/overtakes?session_key=${key}`).catch(() => [] as OpenF1Overtake[]);
  const rawSwing = await step<OpenF1ChampionshipDriver>(`/championship_drivers?session_key=${key}`).catch(() => [] as OpenF1ChampionshipDriver[]);

  const { laps, byDriver, totalLaps } = toLapTable(rawLaps);

  const positions: ReplayModel['positions'] = {};
  for (const p of rawPositions) (positions[p.driver_number] ??= []).push([ms(p.date), p.position]);
  for (const list of Object.values(positions)) list.sort((a, b) => a[0] - b[0]);

  const stints: ReplayModel['stints'] = {};
  for (const s of rawStints) {
    (stints[s.driver_number] ??= []).push({ lapStart: s.lap_start, lapEnd: s.lap_end ?? totalLaps, compound: s.compound ?? 'UNKNOWN', ageAtStart: s.tyre_age_at_start ?? 0 });
  }

  const events: ReplayModel['events'] = [];
  const control: ReplayModel['control'] = [];
  for (const rc of rawRc) {
    const kind = classifyRaceControl(rc);
    if (kind) events.push({ t: ms(rc.date), lap: rc.lap_number, kind, message: rc.message });
    if (isNotableControl(rc)) control.push([ms(rc.date), rc.lap_number, rc.category, rc.message]);
  }
  events.sort((a, b) => a.t - b.t);
  control.sort((a, b) => a[0] - b[0]);

  const pits: ReplayModel['pits'] = rawPits
    .map((p): [number, number, number, number | null] => [ms(p.date), p.driver_number, p.lap_number, p.stop_duration ?? (p.pit_duration != null && p.pit_duration < 120 ? p.pit_duration : null)])
    .sort((a, b) => a[0] - b[0]);
  const radio: ReplayModel['radio'] = rawRadio.map((r): [number, number, string] => [ms(r.date), r.driver_number, r.recording_url]).sort((a, b) => a[0] - b[0]);
  const overtakes: ReplayModel['overtakes'] = rawOvertakes
    .map((x): [number, number, number, number] => [ms(x.date), x.overtaking_driver_number, x.overtaken_driver_number, x.position])
    .sort((a, b) => a[0] - b[0]);
  const swing: ReplayModel['swing'] = {};
  for (const s of rawSwing) {
    swing[s.driver_number] = { before: s.points_start ?? 0, after: s.points_current ?? 0, posBefore: s.position_start, posAfter: s.position_current };
  }

  const firstStarts = Object.values(laps).map((l) => l.starts[0]).filter((t) => Number.isFinite(t));
  const start = firstStarts.length ? Math.min(...firstStarts) : ms(session.date_start);
  const ends = Object.values(laps).map((l) => l.starts[l.starts.length - 1] + l.durations[l.durations.length - 1]).filter(Number.isFinite);
  const end = ends.length ? Math.max(...ends) : ms(session.date_end);

  const finalOrder = drivers.map((d) => ({ num: d.number, pos: positions[d.number]?.at(-1)?.[1] ?? 99 })).sort((a, b) => a.pos - b.pos);
  const refDriver = finalOrder[0]?.num ?? drivers[0]?.number;
  const refLaps = byDriver.get(refDriver) ?? [];
  const refLap = refLaps.find((l) => l.lap_number >= 3 && l.date_start && l.lap_duration && !l.is_pit_out_lap) ?? refLaps.find((l) => l.date_start && l.lap_duration);
  let track: ReplayModel['track'] = { points: [], width: 100, height: 100 };
  if (refLap) {
    const trace = await buildTrace(key, refDriver, refLap, o).catch(() => null);
    if (trace) track = { points: trace.points, width: trace.width, height: trace.height };
  }

  return {
    version: 2,
    sessionKey: key,
    name: session.session_name,
    circuit: session.circuit_short_name,
    location: session.location,
    start,
    end,
    totalLaps,
    drivers,
    laps,
    positions,
    stints,
    events,
    control,
    pits,
    radio,
    overtakes,
    swing,
    track,
    reference: { driver: refDriver, lap: refLap?.lap_number ?? 0 },
  };
}

/** Compact replay model for a finished race, cached for a month. */
export async function getRaceReplay(season: string, raceStartIso: string, signal?: AbortSignal): Promise<Loaded<ReplayModel>> {
  const sessions = await getRaceSessions(season, signal);
  const session = matchRaceSession(sessions.data, raceStartIso);
  if (!session) throw new Error('OpenF1 has no session for this race yet');
  if (Date.now() < ms(session.date_end) + LIVE_MARGIN_MS) throw new Error('Replay data becomes available about 30 minutes after the race ends');
  return loadWithCache({
    key: `openf1:replay:v2:${session.session_key}`,
    ttlMs: 30 * DAY_MS,
    fetcher: () => buildModel(session, signal),
  });
}

/* ---------- pure helpers used by the replay UI ---------- */

export interface CarState {
  lap: number; // 0 before lights out
  progress: number; // 0..1 along the reference lap
  position: number | null;
  compound: string | null;
  tyreAge: number | null;
  lastLap: number | null; // ms, last completed lap
  bestLap: number | null; // ms, best so far
  pits: number;
}

export function carStateAt(model: ReplayModel, driver: number, t: number): CarState {
  const laps = model.laps[driver];
  let lap = 0;
  let progress = 0;
  let lastLap: number | null = null;
  let bestLap: number | null = null;
  if (laps && laps.starts.length) {
    if (t >= laps.starts[0]) {
      let i = laps.starts.length - 1;
      while (i > 0 && laps.starts[i] > t) i -= 1;
      lap = i + 1;
      progress = Math.min(1, Math.max(0, (t - laps.starts[i]) / Math.max(1, laps.durations[i])));
      const finished = i === laps.starts.length - 1 && t > laps.starts[i] + laps.durations[i];
      if (finished) progress = 1;
      // Completed laps so far: every lap whose start + duration <= t.
      for (let k = 0; k <= i; k++) {
        if (laps.starts[k] + laps.durations[k] <= t) {
          const d = laps.durations[k];
          lastLap = d < MAX_LAP_MS ? d : null;
          if (k > 0 && d < MAX_LAP_MS && (bestLap === null || d < bestLap)) bestLap = d;
        }
      }
    }
  }
  const pos = model.positions[driver];
  let position: number | null = null;
  if (pos && pos.length) {
    let i = pos.length - 1;
    while (i > 0 && pos[i][0] > t) i -= 1;
    position = pos[i][0] <= t ? pos[i][1] : pos[0][1];
  }
  const stint = model.stints[driver]?.find((s) => lap >= s.lapStart && lap <= s.lapEnd) ?? model.stints[driver]?.[0];
  const pits = model.pits.filter((p) => p[1] === driver && p[0] <= t).length;
  return {
    lap,
    progress,
    position,
    compound: stint?.compound ?? null,
    tyreAge: stint ? Math.max(0, lap - stint.lapStart) + stint.ageAtStart : null,
    lastLap,
    bestLap,
    pits,
  };
}

export function pointOnTrack(model: { track: { points: Array<[number, number]> } }, progress: number): [number, number] | null {
  const pts = model.track.points;
  if (pts.length < 2) return null;
  const f = progress * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const k = f - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
}

/** Track status in force at time t, derived from race-control messages. */
export function flagStateAt(events: ReplayModel['events'], t: number): { kind: ReplayEventKind | 'clear'; message: string | null } {
  let state: ReplayEventKind | 'clear' = 'clear';
  let message: string | null = null;
  for (const e of events) {
    if (e.t > t) break;
    message = e.message;
    state = e.kind === 'green' ? 'clear' : e.kind;
  }
  return { kind: state, message };
}

export function leaderLapAt(model: ReplayModel, t: number): number {
  let best = 0;
  for (const d of model.drivers) {
    const s = carStateAt(model, d.number, t);
    if (s.lap > best) best = s.lap;
  }
  return best;
}

/** "1:31.744" from milliseconds. */
export function formatLapTime(msValue: number | null | undefined): string {
  if (msValue == null || !Number.isFinite(msValue)) return '–';
  const total = msValue / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
}

/** Mini-sector colour class from OpenF1 segment codes. */
export function segmentTone(code: number): 'purple' | 'green' | 'yellow' | 'pit' | 'none' {
  if (code === 2051) return 'purple';
  if (code === 2049) return 'green';
  if (code === 2048) return 'yellow';
  if (code === 2064) return 'pit';
  return 'none';
}

export function formatGap(value: number | string | null | undefined): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.replace(/^\+/, '+');
  if (!Number.isFinite(value)) return '';
  return value === 0 ? 'Leader' : `+${value.toFixed(3)}`;
}
