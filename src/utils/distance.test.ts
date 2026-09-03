import { describe, expect, it } from 'vitest';
import { formatCoordinates, formatMiles, haversineMiles } from './distance';

const morrisville = { latitude: 35.8235, longitude: -78.8256 };

describe('haversineMiles', () => {
  it('measures Morrisville → downtown Raleigh at roughly 12–14 miles', () => {
    const raleigh = { latitude: 35.7796, longitude: -78.6382 };
    const miles = haversineMiles(morrisville, raleigh);
    expect(miles).toBeGreaterThan(10);
    expect(miles).toBeLessThan(15);
  });

  it('is zero for the same point and symmetric', () => {
    const vir = { latitude: 36.56245, longitude: -79.20635 };
    expect(haversineMiles(morrisville, morrisville)).toBe(0);
    expect(haversineMiles(morrisville, vir)).toBeCloseTo(haversineMiles(vir, morrisville), 6);
  });
});

describe('formatting', () => {
  it('rounds miles and handles short hops', () => {
    expect(formatMiles(12.4)).toBe('12 MI');
    expect(formatMiles(0.4)).toBe('<1 MI');
    expect(formatMiles(undefined)).toBe('');
  });

  it('formats coordinates with hemispheres', () => {
    expect(formatCoordinates(morrisville)).toBe('35.8235° N, 78.8256° W');
  });
});
