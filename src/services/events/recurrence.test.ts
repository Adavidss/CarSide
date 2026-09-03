import { describe, expect, it } from 'vitest';
import type { RecurrenceRule } from '@/models/events';
import { describeRecurrence, expandRecurrence } from './recurrence';

const NY = 'America/New_York';

describe('expandRecurrence (monthly)', () => {
  const firstSaturday: RecurrenceRule = {
    freq: 'monthly',
    weekday: 'SA',
    ordinal: 1,
    startTime: '08:00',
    endTime: '11:00',
    timezone: NY,
  };

  it('finds the first Saturday of each month at the right local time (EDT)', () => {
    const out = expandRecurrence(firstSaturday, new Date('2026-09-01T00:00:00Z'), new Date('2026-09-30T23:59:59Z'));
    expect(out).toHaveLength(1);
    expect(out[0].dateKey).toBe('2026-09-05');
    expect(out[0].start.toISOString()).toBe('2026-09-05T12:00:00.000Z'); // 08:00 EDT
    expect(out[0].end?.toISOString()).toBe('2026-09-05T15:00:00.000Z');
  });

  it('respects the DST change (EST in November)', () => {
    const out = expandRecurrence(firstSaturday, new Date('2026-11-01T00:00:00Z'), new Date('2026-11-30T23:59:59Z'));
    expect(out[0].dateKey).toBe('2026-11-07');
    expect(out[0].start.toISOString()).toBe('2026-11-07T13:00:00.000Z'); // 08:00 EST
  });

  it('handles "last Saturday" and fourth Sundays', () => {
    const lastSat = expandRecurrence(
      { ...firstSaturday, ordinal: -1 },
      new Date('2026-10-01T00:00:00Z'),
      new Date('2026-10-31T23:59:59Z'),
    );
    expect(lastSat.map((o) => o.dateKey)).toEqual(['2026-10-31']);

    const fourthSun = expandRecurrence(
      { ...firstSaturday, weekday: 'SU', ordinal: 4 },
      new Date('2026-09-01T00:00:00Z'),
      new Date('2026-10-31T23:59:59Z'),
    );
    expect(fourthSun.map((o) => o.dateKey)).toEqual(['2026-09-27', '2026-10-25']);
  });

  it('skips exceptions and dates outside the season', () => {
    const out = expandRecurrence(
      { ...firstSaturday, exceptions: ['2026-10-03'], seasonEnd: '2026-11-30' },
      new Date('2026-09-01T00:00:00Z'),
      new Date('2026-12-31T23:59:59Z'),
    );
    expect(out.map((o) => o.dateKey)).toEqual(['2026-09-05', '2026-11-07']);
  });
});

describe('expandRecurrence (weekly)', () => {
  it('lists every Sunday in the window', () => {
    const out = expandRecurrence(
      { freq: 'weekly', weekday: 'SU', startTime: '09:00', endTime: '11:00', timezone: NY },
      new Date('2026-09-02T12:00:00Z'),
      new Date('2026-09-20T23:59:59Z'),
    );
    expect(out.map((o) => o.dateKey)).toEqual(['2026-09-06', '2026-09-13', '2026-09-20']);
    expect(out[0].start.toISOString()).toBe('2026-09-06T13:00:00.000Z');
  });

  it('supports every-N-weeks anchored to the season start', () => {
    const out = expandRecurrence(
      { freq: 'weekly', weekday: 'SA', interval: 2, startTime: '10:00', timezone: NY, seasonStart: '2026-09-05' },
      new Date('2026-09-01T00:00:00Z'),
      new Date('2026-10-10T23:59:59Z'),
    );
    expect(out.map((o) => o.dateKey)).toEqual(['2026-09-05', '2026-09-19', '2026-10-03']);
  });
});

describe('describeRecurrence', () => {
  it('describes rules in plain language', () => {
    expect(describeRecurrence({ freq: 'monthly', weekday: 'SA', ordinal: 1, startTime: '08:00', timezone: NY })).toBe('First Saturday monthly');
    expect(describeRecurrence({ freq: 'monthly', weekday: 'SA', ordinal: -1, startTime: '08:00', timezone: NY })).toBe('Last Saturday monthly');
    expect(describeRecurrence({ freq: 'weekly', weekday: 'SU', startTime: '09:00', timezone: NY })).toBe('Every Sunday');
  });
});
