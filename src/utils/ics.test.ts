import { describe, expect, it } from 'vitest';
import { buildIcs, icsFilename } from './ics';

describe('buildIcs', () => {
  it('produces a valid calendar with UTC timestamps and escaped text', () => {
    const ics = buildIcs([
      {
        uid: 'test-1@carside',
        title: 'F1 Italian Grand Prix — Qualifying',
        start: new Date('2026-09-05T14:00:00Z'),
        end: new Date('2026-09-05T15:00:00Z'),
        location: 'Autodromo Nazionale di Monza, Monza, Italy',
        description: 'Line one\nLine two; with, punctuation',
        url: 'https://example.com',
      },
    ]);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20260905T140000Z');
    expect(ics).toContain('DTEND:20260905T150000Z');
    expect(ics).toContain('LOCATION:Autodromo Nazionale di Monza\\, Monza\\, Italy');
    expect(ics).toContain('DESCRIPTION:Line one\\nLine two\\; with\\, punctuation');
    expect(ics).toContain('UID:test-1@carside');
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('uses exclusive DATE values for all-day events', () => {
    const start = new Date(2026, 8, 25);
    const end = new Date(2026, 8, 27);
    const ics = buildIcs([{ uid: 'x', title: 'NHRA weekend', start, end, allDay: true }]);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260925');
    expect(ics).toContain('DTEND;VALUE=DATE:20260927');
  });

  it('folds long lines at 75 octets', () => {
    const ics = buildIcs([{ uid: 'x', title: 'A'.repeat(120), start: new Date(), end: new Date() }]);
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});

describe('icsFilename', () => {
  it('slugifies titles', () => {
    expect(icsFilename('Cars & Coffee Morrisville')).toBe('cars-coffee-morrisville.ics');
    expect(icsFilename('   ')).toBe('carside-event.ics');
  });
});
