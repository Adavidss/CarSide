import { describe, expect, it } from 'vitest';
import { countdownParts, dayKey, formatDateSpan, formatDuration, getWeekendWindow } from './dates';

describe('getWeekendWindow', () => {
  it('labels Monday–Wednesday as "Coming up" and runs through the coming Sunday', () => {
    const wednesday = new Date(2026, 8, 2, 14, 0); // Wed Sep 2 2026, local
    const win = getWeekendWindow(wednesday);
    expect(win.label).toBe('Coming up');
    expect(dayKey(win.end)).toBe('2026-09-06');
    expect(dayKey(win.weekendStart)).toBe('2026-09-04');
    expect(dayKey(win.nextWeekendStart)).toBe('2026-09-11');
    expect(dayKey(win.nextWeekendEnd)).toBe('2026-09-13');
  });

  it('labels Thursday–Sunday as "This weekend"', () => {
    expect(getWeekendWindow(new Date(2026, 8, 3, 9)).label).toBe('This weekend'); // Thursday
    expect(getWeekendWindow(new Date(2026, 8, 4, 17)).label).toBe('This weekend'); // Friday
    expect(getWeekendWindow(new Date(2026, 8, 6, 20)).label).toBe('This weekend'); // Sunday
  });

  it('ends the window on the same day when today is Sunday', () => {
    const sunday = new Date(2026, 8, 6, 20, 30);
    const win = getWeekendWindow(sunday);
    expect(dayKey(win.end)).toBe('2026-09-06');
    expect(win.end.getHours()).toBe(23);
  });
});

describe('countdownParts', () => {
  it('splits a duration into days, hours, minutes and seconds', () => {
    const now = new Date(2026, 8, 2, 12, 0, 0);
    const target = new Date(2026, 8, 5, 14, 18, 42);
    expect(countdownParts(target, now)).toMatchObject({ days: 3, hours: 2, minutes: 18, seconds: 42 });
  });

  it('never goes negative', () => {
    const now = new Date(2026, 8, 2, 12);
    expect(countdownParts(new Date(2026, 8, 1), now)).toMatchObject({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
  });
});

describe('formatting helpers', () => {
  it('formats date spans within and across months', () => {
    expect(formatDateSpan(new Date(2026, 8, 5), new Date(2026, 8, 6))).toBe('Sep 5 – 6');
    expect(formatDateSpan(new Date(2026, 8, 30), new Date(2026, 9, 2))).toBe('Sep 30 – Oct 2');
    expect(formatDateSpan(new Date(2026, 8, 5), new Date(2026, 8, 5))).toBe('Sep 5');
  });

  it('formats durations compactly', () => {
    expect(formatDuration(45 * 60_000)).toBe('45m');
    expect(formatDuration(135 * 60_000)).toBe('2h 15m');
    expect(formatDuration(52 * 3_600_000)).toBe('2d 4h');
  });
});
