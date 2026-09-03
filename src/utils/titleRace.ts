import type { F1Race } from '@/models/f1';

export interface TitleEntry {
  id: string;
  code: string;
  name: string;
  points: number;
  colour?: string;
}

export interface TitleContender extends TitleEntry {
  gap: number;
  alive: boolean;
}

export interface TitleRaceSummary {
  roundsLeft: number;
  sprintsLeft: number;
  maxRemaining: number;
  maxThisWeekend: number;
  contenders: TitleContender[];
  note: string | null;
}

/** Maximum points per weekend under the 2025+ system (no fastest-lap point). */
const PER_ROUND = {
  drivers: { race: 25, sprint: 8 },
  constructors: { race: 43, sprint: 15 },
} as const;

/**
 * Who can still win, and what the leader needs. "Alive" means a contender could still
 * reach the leader's current total if they scored every point left — the standard
 * mathematical test, ties counted as alive (count-back decides).
 */
export function computeTitleRace(entries: TitleEntry[], races: F1Race[], now: Date, kind: 'drivers' | 'constructors'): TitleRaceSummary {
  const remaining = races.filter((r) => new Date(r.raceEnd).getTime() > now.getTime());
  const pts = PER_ROUND[kind];
  const perRound = (r: F1Race) => pts.race + (r.sprintWeekend ? pts.sprint : 0);
  const maxRemaining = remaining.reduce((sum, r) => sum + perRound(r), 0);
  const maxThisWeekend = remaining[0] ? perRound(remaining[0]) : 0;
  const sorted = [...entries].sort((a, b) => b.points - a.points);
  const leader = sorted[0];
  const contenders: TitleContender[] = sorted.map((e) => ({
    ...e,
    gap: leader ? leader.points - e.points : 0,
    alive: leader ? e.points + maxRemaining >= leader.points : true,
  }));

  let note: string | null = null;
  const second = sorted[1];
  if (leader && second) {
    const gap = leader.points - second.points;
    if (remaining.length === 0) {
      note = gap > 0 ? `${leader.name} — champion.` : `${leader.name} and ${second.name} are level on points; count-back decides.`;
    } else if (gap > maxRemaining) {
      note = `${leader.name} — title clinched, ${gap} clear with ${maxRemaining} left.`;
    } else {
      const maxAfterNext = maxRemaining - maxThisWeekend;
      const need = maxAfterNext + 1 - gap;
      if (need <= maxThisWeekend) {
        note = `${leader.name} can clinch at the ${remaining[0].name} by outscoring ${second.name} by ${need}.`;
      } else {
        note = `${second.name} trails by ${gap} with ${maxRemaining} points still available.`;
      }
    }
  }

  return {
    roundsLeft: remaining.length,
    sprintsLeft: remaining.filter((r) => r.sprintWeekend).length,
    maxRemaining,
    maxThisWeekend,
    contenders,
    note,
  };
}
