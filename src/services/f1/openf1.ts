/**
 * OpenF1 (https://openf1.org) — community F1 data API, CORS-enabled, no key needed for
 * sessions that have ended (real-time data is a paid tier a static site cannot use).
 * We only read finished sessions and reduce them to a compact replay model that is
 * cached for a month, so each race costs one burst of six requests.
 */
import { fetchJson } from '@/services/http';
import { loadWithCache, type Loaded } from '@/services/cache';
import { DAY_MS, HOUR_MS } from '@/utils/dates';

const BASE = 'https://api.openf1.org/v1';
const RATE_GAP_MS = 400; // free tier: 3 requests/s, 30/min

interface OpenF1Session {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  circuit_short_name: string;
  location: string;
  country_name: string;
  year: number;
}
interface OpenF1Driver {
  driver_number: number;
  name_acronym: string | null;
  full_name: string | null;
  team_name: string | null;
  team_colour: string | null;
}
interface OpenF1Lap {
  driver_number: number;
  lap_number: number;
  date_start: string | null;
  lap_duration: number | null;
  is_pit_out_lap: boolean;
}
interface OpenF1Position {
  driver_number: number;
  position: number;
  date: string;
}
interface OpenF1Stint {
  driver_number: number;
  lap_start: number;
  lap_end: number | null;
  compound: string | null;
}
interface OpenF1RaceControl {
  date: string;
  category: string;
  flag: string | null;
  scope: string | null;
  message: string;
  lap_number: number | null;
}
interface OpenF1Location {
  date: string;
  x: number;
  y: number;
}

export type ReplayEventKind = 'sc' | 'vsc' | 'red' | 'yellow' | 'green' | 'chequered';

export interface ReplayDriver {
  number: number;
  code: string;
  name: string;
  team: string;
  colour: string;
}

export interface ReplayModel {
  sessionKey: number;
  name: string;
  circuit: string;
  location: string;
  /** Epoch ms of the first lap start (lights out) and the leader's finish. */
  start: number;
  end: number;
  totalLaps: number;
  drivers: ReplayDriver[];
  /** Per driver number: lap start times and durations in ms, index = lap − 1. */
  laps: Record<number, { starts: number[]; durations: number[] }>;
  /** Per driver number: [epoch ms, position] in time order. */
  positions: Record<number, Array<[number, number]>>;
  stints: Record<number, Array<{ lapStart: number; lapEnd: number; compound: string }>>;
  events: Array<{ t: number; lap: number | null; kind: ReplayEventKind; message: string }>;
  /** Reference lap trace normalised into a box whose longest side is 100. */
  track: { points: Array<[number, number]>; width: number; height: number };
  reference: { driver: number; lap: number };
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const data = await fetchJson<T | { detail?: string }>(`${BASE}${path}`, { signal, timeoutMs: 20_000 });
  if (!Array.isArray(data)) throw new Error((data as { detail?: string }).detail ?? 'OpenF1 returned no data');
  return data as T;
}

const ms = (iso: string) => new Date(iso).getTime();

/** Race sessions for a season, cached; used to map a Jolpica race onto an OpenF1 session key. */
export function getRaceSessions(year: string, signal?: AbortSignal): Promise<Loaded<OpenF1Session[]>> {
  return loadWithCache({
    key: `openf1:races:${year}`,
    ttlMs: 12 * HOUR_MS,
    fetcher: () => get<OpenF1Session[]>(`/sessions?year=${year}&session_type=Race&session_name=Race`, signal),
  });
}

export function matchRaceSession(sessions: OpenF1Session[], raceStartIso: string): OpenF1Session | undefined {
  const target = ms(raceStartIso);
  return sessions
    .filter((s) => Math.abs(ms(s.date_start) - target) < 36 * HOUR_MS)
    .sort((a, b) => Math.abs(ms(a.date_start) - target) - Math.abs(ms(b.date_start) - target))[0];
}

function classify(rc: OpenF1RaceControl): ReplayEventKind | null {
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

async function buildModel(session: OpenF1Session, signal?: AbortSignal): Promise<ReplayModel> {
  const key = session.session_key;

  const rawDrivers = await get<OpenF1Driver[]>(`/drivers?session_key=${key}`, signal);
  await sleep(RATE_GAP_MS);
  const rawLaps = await get<OpenF1Lap[]>(`/laps?session_key=${key}`, signal);
  await sleep(RATE_GAP_MS);
  const rawPositions = await get<OpenF1Position[]>(`/position?session_key=${key}`, signal);
  await sleep(RATE_GAP_MS);
  const rawStints = await get<OpenF1Stint[]>(`/stints?session_key=${key}`, signal);
  await sleep(RATE_GAP_MS);
  const rawRc = await get<OpenF1RaceControl[]>(`/race_control?session_key=${key}`, signal).catch(() => [] as OpenF1RaceControl[]);

  const drivers: ReplayDriver[] = rawDrivers
    .map((d) => ({
      number: d.driver_number,
      code: d.name_acronym ?? String(d.driver_number),
      name: d.full_name ?? d.name_acronym ?? String(d.driver_number),
      team: d.team_name ?? '',
      colour: d.team_colour ? `#${d.team_colour}` : '#8a8985',
    }))
    .sort((a, b) => a.number - b.number);

  // Laps → per-driver start times and durations. Missing first-lap starts are back-filled.
  const laps: ReplayModel['laps'] = {};
  const byDriver = new Map<number, OpenF1Lap[]>();
  for (const lap of rawLaps) {
    if (!byDriver.has(lap.driver_number)) byDriver.set(lap.driver_number, []);
    byDriver.get(lap.driver_number)!.push(lap);
  }
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

  const positions: ReplayModel['positions'] = {};
  for (const p of rawPositions) {
    (positions[p.driver_number] ??= []).push([ms(p.date), p.position]);
  }
  for (const list of Object.values(positions)) list.sort((a, b) => a[0] - b[0]);

  const stints: ReplayModel['stints'] = {};
  for (const s of rawStints) {
    (stints[s.driver_number] ??= []).push({ lapStart: s.lap_start, lapEnd: s.lap_end ?? totalLaps, compound: s.compound ?? 'UNKNOWN' });
  }

  const events: ReplayModel['events'] = [];
  for (const rc of rawRc) {
    const kind = classify(rc);
    if (kind) events.push({ t: ms(rc.date), lap: rc.lap_number, kind, message: rc.message });
  }
  events.sort((a, b) => a.t - b.t);

  const firstStarts = Object.values(laps).map((l) => l.starts[0]).filter((t) => Number.isFinite(t));
  const start = firstStarts.length ? Math.min(...firstStarts) : ms(session.date_start);
  const ends = Object.values(laps).map((l) => l.starts[l.starts.length - 1] + l.durations[l.durations.length - 1]).filter(Number.isFinite);
  const end = ends.length ? Math.max(...ends) : ms(session.date_end);

  // Reference lap for the track trace: the finisher in P1, on an early clean lap.
  const finalOrder = drivers
    .map((d) => ({ num: d.number, pos: positions[d.number]?.at(-1)?.[1] ?? 99 }))
    .sort((a, b) => a.pos - b.pos);
  const refDriver = finalOrder[0]?.num ?? drivers[0]?.number;
  const refLaps = byDriver.get(refDriver) ?? [];
  const refLap =
    refLaps.find((l) => l.lap_number >= 3 && l.date_start && l.lap_duration && !l.is_pit_out_lap) ??
    refLaps.find((l) => l.date_start && l.lap_duration);
  let track: ReplayModel['track'] = { points: [], width: 100, height: 100 };
  if (refLap?.date_start && refLap.lap_duration) {
    await sleep(RATE_GAP_MS);
    const from = new Date(ms(refLap.date_start)).toISOString();
    const to = new Date(ms(refLap.date_start) + refLap.lap_duration * 1000).toISOString();
    const raw = await get<OpenF1Location[]>(
      `/location?session_key=${key}&driver_number=${refDriver}&date>=${from}&date<=${to}`,
      signal,
    ).catch(() => [] as OpenF1Location[]);
    const pts = raw.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && (p.x !== 0 || p.y !== 0));
    if (pts.length > 20) {
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
      track = { points, width: Math.round(spanX * scale * 10) / 10, height: Math.round(spanY * scale * 10) / 10 };
    }
  }

  return {
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
    track,
    reference: { driver: refDriver, lap: refLap?.lap_number ?? 0 },
  };
}

/** Compact replay model for a finished race, cached for a month. */
export async function getRaceReplay(season: string, raceStartIso: string, signal?: AbortSignal): Promise<Loaded<ReplayModel>> {
  const sessions = await getRaceSessions(season, signal);
  const session = matchRaceSession(sessions.data, raceStartIso);
  if (!session) throw new Error('OpenF1 has no session for this race yet');
  if (Date.now() < ms(session.date_end)) throw new Error('Replay data becomes available once the race has ended');
  return loadWithCache({
    key: `openf1:replay:${session.session_key}`,
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
}

export function carStateAt(model: ReplayModel, driver: number, t: number): CarState {
  const laps = model.laps[driver];
  let lap = 0;
  let progress = 0;
  if (laps && laps.starts.length) {
    if (t >= laps.starts[0]) {
      let i = laps.starts.length - 1;
      while (i > 0 && laps.starts[i] > t) i -= 1;
      lap = i + 1;
      progress = Math.min(1, Math.max(0, (t - laps.starts[i]) / Math.max(1, laps.durations[i])));
      const finished = i === laps.starts.length - 1 && t > laps.starts[i] + laps.durations[i];
      if (finished) progress = 1;
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
  return { lap, progress, position, compound: stint?.compound ?? null };
}

export function pointOnTrack(model: ReplayModel, progress: number): [number, number] | null {
  const pts = model.track.points;
  if (pts.length < 2) return null;
  const f = progress * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const k = f - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
}

/** Track status in force at time t, derived from race-control messages. */
export function flagStateAt(model: ReplayModel, t: number): { kind: ReplayEventKind | 'clear'; message: string | null } {
  let state: ReplayEventKind | 'clear' = 'clear';
  let message: string | null = null;
  for (const e of model.events) {
    if (e.t > t) break;
    message = e.message;
    if (e.kind === 'green') state = 'clear';
    else state = e.kind;
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
