import type { F1Race, F1Session, F1SessionKey } from '@/models/f1';
import type { JolpicaRace, JolpicaSessionTime } from './jolpica';

/** Nominal session lengths in minutes — used for "live now" and end times, not timing accuracy. */
const DURATION_MINUTES: Record<F1SessionKey, number> = {
  fp1: 60,
  fp2: 60,
  fp3: 60,
  sprintQualifying: 45,
  sprint: 60,
  qualifying: 60,
  race: 135,
};

const LABELS: Record<F1SessionKey, { label: string; shortLabel: string }> = {
  fp1: { label: 'Practice 1', shortLabel: 'FP1' },
  fp2: { label: 'Practice 2', shortLabel: 'FP2' },
  fp3: { label: 'Practice 3', shortLabel: 'FP3' },
  sprintQualifying: { label: 'Sprint Qualifying', shortLabel: 'SQ' },
  sprint: { label: 'Sprint', shortLabel: 'SPRINT' },
  qualifying: { label: 'Qualifying', shortLabel: 'QUALI' },
  race: { label: 'Grand Prix', shortLabel: 'RACE' },
};

function toSession(key: F1SessionKey, slot: JolpicaSessionTime | undefined): F1Session | null {
  if (!slot?.date) return null;
  const timeTbc = !slot.time;
  const startIso = `${slot.date}T${slot.time ?? '12:00:00Z'}`;
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + DURATION_MINUTES[key] * 60_000);
  return {
    key,
    ...LABELS[key],
    start: start.toISOString(),
    end: end.toISOString(),
    ...(timeTbc ? { timeTbc: true } : {}),
  };
}

export function normalizeRace(race: JolpicaRace): F1Race {
  const sprintQualifying = race.SprintQualifying ?? race.SprintShootout;
  const sessions = [
    toSession('fp1', race.FirstPractice),
    toSession('fp2', race.SecondPractice),
    toSession('fp3', race.ThirdPractice),
    toSession('sprintQualifying', sprintQualifying),
    toSession('sprint', race.Sprint),
    toSession('qualifying', race.Qualifying),
    toSession('race', { date: race.date, time: race.time }),
  ]
    .filter((s): s is F1Session => s !== null)
    .sort((a, b) => a.start.localeCompare(b.start));

  const raceSession = sessions.find((s) => s.key === 'race')!;
  const lat = Number(race.Circuit.Location.lat);
  const lng = Number(race.Circuit.Location.long);

  return {
    season: race.season,
    round: Number(race.round),
    name: race.raceName,
    circuitId: race.Circuit.circuitId,
    circuitName: race.Circuit.circuitName,
    locality: race.Circuit.Location.locality,
    country: race.Circuit.Location.country,
    latitude: Number.isFinite(lat) ? lat : undefined,
    longitude: Number.isFinite(lng) ? lng : undefined,
    wikipediaUrl: race.url,
    circuitUrl: race.Circuit.url,
    sessions,
    raceStart: raceSession.start,
    raceEnd: raceSession.end,
    sprintWeekend: Boolean(race.Sprint),
  };
}
