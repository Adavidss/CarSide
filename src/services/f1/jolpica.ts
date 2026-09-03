/**
 * Jolpica F1 API — the community successor to Ergast. Public, CORS-enabled, no key.
 * https://api.jolpi.ca/ergast/f1/
 */
import { fetchJson } from '@/services/http';
import type {
  ConstructorStanding,
  DriverStanding,
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
