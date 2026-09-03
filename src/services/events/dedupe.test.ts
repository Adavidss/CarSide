import { describe, expect, it } from 'vitest';
import type { CarEvent } from '@/models/events';
import { dedupeEvents } from './dedupe';

const base: CarEvent = {
  id: 'curated:a',
  title: 'Cars and Coffee Morrisville',
  type: 'cars-and-coffee',
  start: '2026-09-05T08:00:00-04:00',
  city: 'Durham',
  latitude: 35.876,
  longitude: -78.849,
  source: { id: 'curated', name: 'Curated' },
};

describe('dedupeEvents', () => {
  it('prefers a dated entry over the recurring occurrence for the same day', () => {
    const recurring: CarEvent = { ...base, id: 'curated:rule@2026-09-05', recurring: true };
    const dated: CarEvent = { ...base, id: 'curated:dated', subtitle: 'Motorcycle Day' };
    const out = dedupeEvents([recurring, dated]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('curated:dated');
  });

  it('treats a longer title with the same prefix as the same event', () => {
    const a: CarEvent = { ...base, id: 'x' };
    const b: CarEvent = { ...base, id: 'y', title: 'Cars and Coffee Morrisville - Tuner Day' };
    expect(dedupeEvents([a, b])).toHaveLength(1);
  });

  it('keeps events on different days or far apart', () => {
    const a: CarEvent = { ...base, id: 'x' };
    const b: CarEvent = { ...base, id: 'y', start: '2026-10-03T08:00:00-04:00' };
    const c: CarEvent = { ...base, id: 'z', latitude: 36.5, longitude: -79.2 };
    expect(dedupeEvents([a, b, c])).toHaveLength(3);
  });

  it('keeps the first of two identical ids', () => {
    expect(dedupeEvents([base, { ...base }])).toHaveLength(1);
  });
});
