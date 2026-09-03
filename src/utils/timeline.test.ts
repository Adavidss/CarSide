import { describe, expect, it } from 'vitest';
import type { EventWithDistance } from '@/models/events';
import type { F1Race } from '@/models/f1';
import { buildTimeline, groupByDay, pickNextUp } from './timeline';

const race: F1Race = {
  season: '2026',
  round: 13,
  name: 'Italian Grand Prix',
  circuitId: 'monza',
  circuitName: 'Autodromo Nazionale di Monza',
  locality: 'Monza',
  country: 'Italy',
  sessions: [
    { key: 'qualifying', label: 'Qualifying', shortLabel: 'QUALI', start: '2026-09-05T14:00:00.000Z', end: '2026-09-05T15:00:00.000Z' },
    { key: 'race', label: 'Grand Prix', shortLabel: 'RACE', start: '2026-09-06T13:00:00.000Z', end: '2026-09-06T15:15:00.000Z' },
  ],
  raceStart: '2026-09-06T13:00:00.000Z',
  raceEnd: '2026-09-06T15:15:00.000Z',
  sprintWeekend: false,
};

const meet: EventWithDistance = {
  id: 'curated:meet',
  title: 'Cars and Coffee Morrisville',
  type: 'cars-and-coffee',
  start: '2026-09-05T12:00:00.000Z', // 08:00 EDT
  end: '2026-09-05T15:00:00.000Z',
  city: 'Durham',
  source: { id: 'curated', name: 'Curated' },
  distanceMiles: 4,
};

const raceNight: EventWithDistance = {
  id: 'curated:race-night',
  title: 'Wake County Speedway',
  type: 'motorsport',
  start: '2026-09-04T04:00:00.000Z', // local midnight, time TBD
  timeTbd: true,
  city: 'Raleigh',
  source: { id: 'curated', name: 'Curated' },
  distanceMiles: 10,
};

const from = new Date('2026-09-02T00:00:00Z');
const to = new Date('2026-09-06T23:59:59Z');

describe('buildTimeline', () => {
  it('merges F1 sessions and events in chronological order', () => {
    const items = buildTimeline({ races: [race], events: [meet, raceNight], from, to });
    expect(items.map((i) => i.id)).toEqual(['curated:race-night', 'curated:meet', 'f1:2026:13:qualifying', 'f1:2026:13:race']);
  });

  it('sorts date-only items after timed items on the same day', () => {
    const sameDay: EventWithDistance = { ...raceNight, id: 'tbd', start: '2026-09-05T04:00:00.000Z' };
    const items = buildTimeline({ races: [race], events: [meet, sameDay], from, to });
    expect(items.map((i) => i.id)).toEqual(['curated:meet', 'f1:2026:13:qualifying', 'tbd', 'f1:2026:13:race']);
  });
});

describe('pickNextUp', () => {
  const items = buildTimeline({ races: [race], events: [meet, raceNight], from, to });

  it('prefers a live session', () => {
    const during = new Date('2026-09-05T14:30:00Z');
    expect(pickNextUp(items, during)?.id).toBe('f1:2026:13:qualifying');
  });

  it('otherwise picks the next timed item, skipping time-TBD entries', () => {
    const thursday = new Date('2026-09-03T12:00:00Z');
    expect(pickNextUp(items, thursday)?.id).toBe('curated:meet');
  });

  it('falls back to a date-only item when nothing timed remains', () => {
    const onlyTbd = buildTimeline({ events: [raceNight], from, to });
    expect(pickNextUp(onlyTbd, new Date('2026-09-04T10:00:00Z'))?.id).toBe('curated:race-night');
  });
});

describe('groupByDay', () => {
  it('groups by local day and files ongoing multi-day events under today', () => {
    const festival: EventWithDistance = {
      ...raceNight,
      id: 'festival',
      timeTbd: false,
      allDay: true,
      start: '2026-09-01T04:00:00.000Z',
      end: '2026-09-08T03:59:59.000Z',
    };
    const now = new Date('2026-09-03T16:00:00Z');
    const items = buildTimeline({ events: [festival, meet], from: now, to });
    const groups = groupByDay(items, now);
    expect(groups[0].items[0].id).toBe('festival');
    expect(groups[0].items[0].ongoing).toBe(true);
    expect(groups).toHaveLength(2);
  });
});
