import { describe, expect, it } from 'vitest';
import { getWatchability } from './watchability';

const at = (hour: number, minute = 0) => new Date(2026, 8, 6, hour, minute);

describe('getWatchability', () => {
  it('rates daytime sessions as easy', () => {
    expect(getWatchability(at(9)).key).toBe('easy');
    expect(getWatchability(at(15)).key).toBe('easy');
    expect(getWatchability(at(20, 59)).key).toBe('easy');
  });

  it('rates early mornings progressively', () => {
    expect(getWatchability(at(7)).key).toBe('early');
    expect(getWatchability(at(5, 30)).key).toBe('alarm');
    expect(getWatchability(at(3)).key).toBe('brutal');
  });

  it('rates late nights', () => {
    expect(getWatchability(at(22)).key).toBe('late');
    expect(getWatchability(at(0, 30)).key).toBe('brutal');
  });
});
