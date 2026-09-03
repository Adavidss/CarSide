import { describe, expect, it } from 'vitest';
import type { F1Race } from '@/models/f1';
import { computeTitleRace } from './titleRace';

const race = (round: number, daysFromNow: number, sprint = false): F1Race => {
  const start = new Date(Date.UTC(2026, 8, 1) + daysFromNow * 86_400_000);
  const end = new Date(start.getTime() + 2 * 3_600_000);
  return {
    season: '2026',
    round,
    name: `Round ${round}`,
    circuitId: 'x',
    circuitName: 'X',
    locality: 'X',
    country: 'X',
    sessions: [],
    raceStart: start.toISOString(),
    raceEnd: end.toISOString(),
    sprintWeekend: sprint,
  };
};

const now = new Date(Date.UTC(2026, 8, 1));
const entries = [
  { id: 'a', code: 'AAA', name: 'Driver A', points: 242 },
  { id: 'b', code: 'BBB', name: 'Driver B', points: 183 },
  { id: 'c', code: 'CCC', name: 'Driver C', points: 100 },
];

describe('computeTitleRace', () => {
  it('counts remaining points including sprints', () => {
    const s = computeTitleRace(entries, [race(1, -10), race(2, 5, true), race(3, 12)], now, 'drivers');
    expect(s.roundsLeft).toBe(2);
    expect(s.sprintsLeft).toBe(1);
    expect(s.maxRemaining).toBe(25 + 8 + 25);
    expect(s.maxThisWeekend).toBe(33);
  });

  it('marks contenders who cannot catch the leader as out', () => {
    // 83 points left: B (183) can still reach 242, C (100) cannot.
    const s = computeTitleRace(entries, [race(2, 5, true), race(3, 12), race(4, 19)], now, 'drivers');
    expect(s.contenders.map((c) => [c.code, c.alive])).toEqual([
      ['AAA', true],
      ['BBB', true],
      ['CCC', false],
    ]);
  });

  it('explains when the leader can clinch this weekend', () => {
    // Gap 59, 58 left after this weekend → needs to outscore B by 0 → clinch possible.
    const s = computeTitleRace(entries, [race(2, 5, true), race(3, 12), race(4, 19)], now, 'drivers');
    expect(s.maxRemaining).toBe(83);
    expect(s.note).toContain('can clinch at the Round 2');
  });

  it('declares the title clinched', () => {
    const s = computeTitleRace(entries, [race(3, 12)], now, 'drivers');
    expect(s.note).toContain('title clinched');
  });

  it('uses constructor points', () => {
    const s = computeTitleRace(entries, [race(2, 5, true)], now, 'constructors');
    expect(s.maxRemaining).toBe(43 + 15);
  });
});
