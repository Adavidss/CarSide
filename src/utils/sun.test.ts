import { describe, expect, it } from 'vitest';
import { lightNote, sunTimes } from './sun';

const minutesOf = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();

describe('sunTimes', () => {
  it('lands within a few minutes of published times for Morrisville, NC in early September', () => {
    // 2026-09-02: sunrise ≈ 06:49 EDT (10:49 UTC), sunset ≈ 19:39 EDT (23:39 UTC).
    const sun = sunTimes(new Date(Date.UTC(2026, 8, 2, 16)), 35.8235, -78.8256)!;
    expect(Math.abs(minutesOf(sun.sunrise) - (10 * 60 + 49))).toBeLessThanOrEqual(8);
    expect(Math.abs(minutesOf(sun.sunset) - (23 * 60 + 39))).toBeLessThanOrEqual(8);
  });

  it('returns null inside the polar circle in midsummer', () => {
    expect(sunTimes(new Date(Date.UTC(2026, 5, 21, 12)), 80, 20)).toBeNull();
  });

  it('flags morning meets as golden-hour starts', () => {
    const sun = { sunrise: new Date('2026-09-05T10:50:00Z'), sunset: new Date('2026-09-05T23:35:00Z') };
    expect(lightNote(new Date('2026-09-05T12:00:00Z'), sun)?.kind).toBe('morning');
    expect(lightNote(new Date('2026-09-05T22:30:00Z'), sun)?.kind).toBe('evening');
    expect(lightNote(new Date('2026-09-05T16:00:00Z'), sun)).toBeNull();
  });
});
