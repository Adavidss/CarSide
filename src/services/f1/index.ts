/**
 * Public F1 data API used by the hooks. Everything is cached in localStorage and
 * degrades gracefully: fresh cache → network → stale cache → bundled fallback.
 * Swap `jolpica.ts` for another provider without touching the UI.
 */
import { appConfig } from '@/config/appConfig';
import type {
  ConstructorStanding,
  DriverStanding,
  F1Race,
  F1Session,
  F1WeekendStatus,
  RaceResult,
  Standings,
} from '@/models/f1';
import { HOUR_MS } from '@/utils/dates';
import { loadWithCache, type Loaded } from '@/services/cache';
import {
  fetchConstructorStandings,
  fetchDriverStandings,
  fetchLastResult,
  fetchSchedule,
  type JolpicaRace,
} from './jolpica';
import { normalizeRace } from './normalize';

const SEASON = appConfig.f1.season;

/** Loaded on demand — the snapshot only matters when the API is down and nothing is cached. */
async function bundledSchedule(): Promise<F1Race[] | undefined> {
  const currentYear = String(new Date().getFullYear());
  const targetSeason = SEASON === 'current' ? currentYear : SEASON;
  const { default: fallbackSchedule } = await import('@/data/f1-schedule-fallback.json');
  if (fallbackSchedule.season !== targetSeason) return undefined;
  return (fallbackSchedule.races as JolpicaRace[]).map(normalizeRace);
}

export function getSchedule(signal?: AbortSignal): Promise<Loaded<F1Race[]>> {
  return loadWithCache<F1Race[]>({
    key: `f1:schedule:${SEASON}`,
    ttlMs: 12 * HOUR_MS,
    fetcher: async () => {
      const races = await fetchSchedule(SEASON, signal);
      if (!races.length) throw new Error('Empty schedule');
      return races.map(normalizeRace);
    },
    fallback: bundledSchedule,
  });
}

export function getDriverStandings(signal?: AbortSignal): Promise<Loaded<Standings<DriverStanding>>> {
  return loadWithCache({
    key: `f1:driverStandings:${SEASON}`,
    ttlMs: 2 * HOUR_MS,
    fetcher: () => fetchDriverStandings(SEASON, signal),
  });
}

export function getConstructorStandings(signal?: AbortSignal): Promise<Loaded<Standings<ConstructorStanding>>> {
  return loadWithCache({
    key: `f1:constructorStandings:${SEASON}`,
    ttlMs: 2 * HOUR_MS,
    fetcher: () => fetchConstructorStandings(SEASON, signal),
  });
}

export function getLastResult(signal?: AbortSignal): Promise<Loaded<RaceResult | null>> {
  return loadWithCache({
    key: `f1:lastResult:${SEASON}`,
    ttlMs: 2 * HOUR_MS,
    fetcher: () => fetchLastResult(SEASON, signal),
  });
}

/* ---------- pure helpers ---------- */

export function getWeekendStatus(race: F1Race, now: Date): F1WeekendStatus {
  const first = race.sessions[0];
  if (!first) return 'upcoming';
  if (now.getTime() < new Date(first.start).getTime()) return 'upcoming';
  if (now.getTime() >= new Date(race.raceEnd).getTime()) return 'complete';
  return 'in-progress';
}

/** The race the app should focus on: the first whose Grand Prix has not finished. */
export function findNextRace(races: F1Race[], now: Date): F1Race | undefined {
  return races.find((race) => new Date(race.raceEnd).getTime() > now.getTime());
}

export function findLastCompletedRace(races: F1Race[], now: Date): F1Race | undefined {
  const done = races.filter((race) => new Date(race.raceEnd).getTime() <= now.getTime());
  return done[done.length - 1];
}

export function isSessionLive(session: F1Session, now: Date): boolean {
  const t = now.getTime();
  return t >= new Date(session.start).getTime() && t < new Date(session.end).getTime();
}

/** The live session if there is one, otherwise the next session to start. */
export function findCurrentSession(race: F1Race, now: Date): F1Session | undefined {
  return race.sessions.find((session) => new Date(session.end).getTime() > now.getTime());
}
