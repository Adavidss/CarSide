/**
 * Jolpica F1 API — the community successor to Ergast. Public, CORS-enabled, no key.
 * https://api.jolpi.ca/ergast/f1/
 */
import { fetchJson } from '@/services/http';
import type {
  CircuitWinner,
  ConstructorStanding,
  DriverRaceResult,
  DriverStanding,
  QualifyingRow,
  RaceResult,
  RaceResultEntry,
  Standings,
} from '@/models/f1';

const BASE = 'https://api.jolpi.ca/ergast/f1';

export interface JolpicaSessionTime {
  date: string;
  time?: string;
}

export interface JolpicaRace {
  season: string;
  round: string;
  url?: string;
  raceName: string;
  Circuit: {
    circuitId: string;
    url?: string;
    circuitName: string;
    Location: { lat: string; long: string; locality: string; country: string };
  };
  date: string;
  time?: string;
  FirstPractice?: JolpicaSessionTime;
  SecondPractice?: JolpicaSessionTime;
  ThirdPractice?: JolpicaSessionTime;
  Qualifying?: JolpicaSessionTime;
  Sprint?: JolpicaSessionTime;
  SprintQualifying?: JolpicaSessionTime;
  /** Older seasons used this name for sprint qualifying. */
  SprintShootout?: JolpicaSessionTime;
}

interface JolpicaDriver {
  driverId: string;
  url?: string;
  code?: string;
  permanentNumber?: string;
  givenName: string;
  familyName: string;
  nationality?: string;
}

interface JolpicaConstructor {
  constructorId: string;
  name: string;
  nationality?: string;
}

interface ScheduleResponse {
  MRData: { RaceTable: { season: string; Races: JolpicaRace[] } };
}

interface DriverStandingsResponse {
  MRData: {
    StandingsTable: {
      season: string;
      StandingsLists: Array<{
        season: string;
        round: string;
        DriverStandings: Array<{
          position: string;
          points: string;
          wins: string;
          Driver: JolpicaDriver;
          Constructors: JolpicaConstructor[];
        }>;
      }>;
    };
  };
}

interface ConstructorStandingsResponse {
  MRData: {
    StandingsTable: {
      season: string;
      StandingsLists: Array<{
        season: string;
        round: string;
        ConstructorStandings: Array<{
          position: string;
          points: string;
          wins: string;
          Constructor: JolpicaConstructor;
        }>;
      }>;
    };
  };
}

interface ResultsResponse {
  MRData: {
    RaceTable: {
      season: string;
      Races: Array<{
        season: string;
        round: string;
        raceName: string;
        date: string;
        Circuit: { circuitName: string };
        Results: Array<{
          position: string;
          points: string;
          grid?: string;
          status: string;
          Driver: JolpicaDriver;
          Constructor: JolpicaConstructor;
          Time?: { time: string };
          FastestLap?: { rank?: string };
        }>;
      }>;
    };
  };
}

export async function fetchSchedule(season: string, signal?: AbortSignal): Promise<JolpicaRace[]> {
  const data = await fetchJson<ScheduleResponse>(`${BASE}/${season}.json?limit=100`, { signal });
  return data.MRData.RaceTable.Races ?? [];
}

function driverCode(driver: JolpicaDriver): string {
  return driver.code ?? driver.familyName.slice(0, 3).toUpperCase();
}

export async function fetchDriverStandings(season: string, signal?: AbortSignal): Promise<Standings<DriverStanding>> {
  const data = await fetchJson<DriverStandingsResponse>(`${BASE}/${season}/driverStandings.json?limit=50`, { signal });
  const list = data.MRData.StandingsTable.StandingsLists[0];
  if (!list) return { season: data.MRData.StandingsTable.season, round: 0, entries: [] };
  return {
    season: list.season,
    round: Number(list.round),
    entries: list.DriverStandings.map((s) => ({
      position: Number(s.position),
      points: Number(s.points),
      wins: Number(s.wins),
      driverId: s.Driver.driverId,
      code: driverCode(s.Driver),
      number: s.Driver.permanentNumber,
      givenName: s.Driver.givenName,
      familyName: s.Driver.familyName,
      nationality: s.Driver.nationality,
      url: s.Driver.url,
      constructorId: s.Constructors[s.Constructors.length - 1]?.constructorId ?? '',
      constructorName: s.Constructors[s.Constructors.length - 1]?.name ?? '',
    })),
  };
}

export async function fetchConstructorStandings(
  season: string,
  signal?: AbortSignal,
): Promise<Standings<ConstructorStanding>> {
  const data = await fetchJson<ConstructorStandingsResponse>(`${BASE}/${season}/constructorStandings.json?limit=50`, {
    signal,
  });
  const list = data.MRData.StandingsTable.StandingsLists[0];
  if (!list) return { season: data.MRData.StandingsTable.season, round: 0, entries: [] };
  return {
    season: list.season,
    round: Number(list.round),
    entries: list.ConstructorStandings.map((s) => ({
      position: Number(s.position),
      points: Number(s.points),
      wins: Number(s.wins),
      constructorId: s.Constructor.constructorId,
      name: s.Constructor.name,
      nationality: s.Constructor.nationality,
    })),
  };
}

export async function fetchLastResult(season: string, signal?: AbortSignal): Promise<RaceResult | null> {
  const data = await fetchJson<ResultsResponse>(`${BASE}/${season}/last/results.json?limit=50`, { signal });
  const race = data.MRData.RaceTable.Races[0];
  if (!race) return null;
  const results: RaceResultEntry[] = race.Results.map((r) => ({
    position: Number(r.position),
    code: driverCode(r.Driver),
    driverId: r.Driver.driverId,
    givenName: r.Driver.givenName,
    familyName: r.Driver.familyName,
    constructorId: r.Constructor.constructorId,
    constructorName: r.Constructor.name,
    grid: r.grid ? Number(r.grid) : undefined,
    gap: r.Time?.time ?? (r.status !== 'Finished' ? r.status : undefined),
    status: r.status,
    points: Number(r.points),
    fastestLap: r.FastestLap?.rank === '1',
  }));
  return {
    season: race.season,
    round: Number(race.round),
    raceName: race.raceName,
    circuitName: race.Circuit.circuitName,
    date: race.date,
    results,
  };
}

interface DriverResultsResponse {
  MRData: {
    RaceTable: {
      Races: Array<{
        round: string;
        raceName: string;
        date: string;
        Circuit: { circuitId: string };
        Results: Array<{ position: string; grid?: string; status: string; points: string; Constructor: JolpicaConstructor }>;
      }>;
    };
  };
}

/** Every classified result for one driver this season (one request). */
export async function fetchDriverSeasonResults(season: string, driverId: string, signal?: AbortSignal): Promise<DriverRaceResult[]> {
  const data = await fetchJson<DriverResultsResponse>(`${BASE}/${season}/drivers/${driverId}/results.json?limit=40`, { signal });
  return data.MRData.RaceTable.Races.map((race) => {
    const r = race.Results[0];
    return {
      round: Number(race.round),
      raceName: race.raceName,
      circuitId: race.Circuit.circuitId,
      date: race.date,
      position: Number(r.position),
      grid: r.grid ? Number(r.grid) : undefined,
      status: r.status,
      points: Number(r.points),
      constructorId: r.Constructor.constructorId,
    };
  });
}

interface QualifyingResponse {
  MRData: {
    RaceTable: {
      Races: Array<{
        QualifyingResults: Array<{ position: string; Driver: JolpicaDriver; Constructor: JolpicaConstructor; Q1?: string; Q2?: string; Q3?: string }>;
      }>;
    };
  };
}

/** Qualifying classification for a round, or null when it hasn't been published. */
export async function fetchQualifying(season: string, round: number, signal?: AbortSignal): Promise<QualifyingRow[] | null> {
  const data = await fetchJson<QualifyingResponse>(`${BASE}/${season}/${round}/qualifying.json?limit=40`, { signal });
  const race = data.MRData.RaceTable.Races[0];
  if (!race?.QualifyingResults?.length) return null;
  return race.QualifyingResults.map((q) => ({
    position: Number(q.position),
    driverId: q.Driver.driverId,
    code: driverCode(q.Driver),
    givenName: q.Driver.givenName,
    familyName: q.Driver.familyName,
    constructorId: q.Constructor.constructorId,
    constructorName: q.Constructor.name,
    q1: q.Q1,
    q2: q.Q2,
    q3: q.Q3,
  }));
}

interface CircuitWinnersResponse {
  MRData: {
    total: string;
    RaceTable: {
      Races: Array<{
        season: string;
        raceName: string;
        Results: Array<{ Driver: JolpicaDriver; Constructor: JolpicaConstructor; Time?: { time: string } }>;
      }>;
    };
  };
}

/** The most recent `count` winners at a circuit (two requests: total, then the tail). */
export async function fetchCircuitWinners(circuitId: string, count = 6, signal?: AbortSignal): Promise<CircuitWinner[]> {
  const probe = await fetchJson<CircuitWinnersResponse>(`${BASE}/circuits/${circuitId}/results/1.json?limit=1`, { signal });
  const total = Number(probe.MRData.total);
  if (!total) return [];
  const offset = Math.max(0, total - count);
  const data = await fetchJson<CircuitWinnersResponse>(`${BASE}/circuits/${circuitId}/results/1.json?limit=${count}&offset=${offset}`, { signal });
  return data.MRData.RaceTable.Races.map((race) => {
    const r = race.Results[0];
    return {
      season: race.season,
      raceName: race.raceName,
      driverId: r.Driver.driverId,
      code: driverCode(r.Driver),
      familyName: r.Driver.familyName,
      constructorId: r.Constructor.constructorId,
      constructorName: r.Constructor.name,
      time: r.Time?.time,
    };
  }).reverse();
}
