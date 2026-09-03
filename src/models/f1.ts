export type F1SessionKey =
  | 'fp1'
  | 'fp2'
  | 'fp3'
  | 'sprintQualifying'
  | 'sprint'
  | 'qualifying'
  | 'race';

export interface F1Session {
  key: F1SessionKey;
  /** "Free Practice 1", "Qualifying", "Race" … */
  label: string;
  /** Timing-board style: "FP1", "SQ", "SPRINT", "QUALI", "RACE". */
  shortLabel: string;
  /** ISO 8601 UTC. */
  start: string;
  /** ISO 8601 UTC — nominal end, used for "live now" and ordering. */
  end: string;
  /** The provider had a date but no confirmed start time. */
  timeTbc?: boolean;
}

export interface F1Race {
  season: string;
  round: number;
  name: string;
  /** Provider circuit id, e.g. "monza". */
  circuitId: string;
  circuitName: string;
  locality: string;
  country: string;
  latitude?: number;
  longitude?: number;
  wikipediaUrl?: string;
  /** Wikipedia article for the circuit (photos, background). */
  circuitUrl?: string;
  sessions: F1Session[];
  /** Convenience: the race session start, ISO UTC. */
  raceStart: string;
  raceEnd: string;
  sprintWeekend: boolean;
}

export type F1WeekendStatus = 'upcoming' | 'in-progress' | 'complete';

export interface DriverStanding {
  position: number;
  points: number;
  wins: number;
  driverId: string;
  code: string;
  number?: string;
  givenName: string;
  familyName: string;
  nationality?: string;
  /** Wikipedia article (portrait, bio). */
  url?: string;
  constructorId: string;
  constructorName: string;
}

export interface DriverRaceResult {
  round: number;
  raceName: string;
  circuitId: string;
  date: string;
  position: number;
  grid?: number;
  status: string;
  points: number;
  constructorId: string;
}

export interface QualifyingRow {
  position: number;
  driverId: string;
  code: string;
  givenName: string;
  familyName: string;
  constructorId: string;
  constructorName: string;
  q1?: string;
  q2?: string;
  q3?: string;
}

export interface CircuitWinner {
  season: string;
  raceName: string;
  driverId: string;
  code: string;
  familyName: string;
  constructorId: string;
  constructorName: string;
  time?: string;
}

export interface ConstructorStanding {
  position: number;
  points: number;
  wins: number;
  constructorId: string;
  name: string;
  nationality?: string;
}

export interface Standings<T> {
  season: string;
  /** Standings are current through this round. */
  round: number;
  entries: T[];
}

export interface RaceResultEntry {
  position: number;
  code: string;
  driverId: string;
  givenName: string;
  familyName: string;
  constructorId: string;
  constructorName: string;
  grid?: number;
  /** "1:31:44.742" for the winner, "+5.123" for the rest, or a status like "+1 Lap". */
  gap?: string;
  status: string;
  points: number;
  fastestLap?: boolean;
}

export interface RaceResult {
  season: string;
  round: number;
  raceName: string;
  circuitName: string;
  date: string;
  results: RaceResultEntry[];
}
