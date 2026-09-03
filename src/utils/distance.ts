import type { GeoPoint } from '@/models/location';

const EARTH_RADIUS_MILES = 3958.7613;

/** Great-circle (straight-line) distance in miles. Not a driving distance. */
export function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "12 MI", "<1 MI", "140 MI". */
export function formatMiles(miles: number | undefined): string {
  if (miles === undefined || Number.isNaN(miles)) return '';
  if (miles < 1) return '<1 MI';
  return `${Math.round(miles)} MI`;
}

/** "35.8235° N, 78.8256° W" — used as an understated header motif. */
export function formatCoordinates(point: GeoPoint): string {
  const lat = `${Math.abs(point.latitude).toFixed(4)}° ${point.latitude >= 0 ? 'N' : 'S'}`;
  const lon = `${Math.abs(point.longitude).toFixed(4)}° ${point.longitude >= 0 ? 'E' : 'W'}`;
  return `${lat}, ${lon}`;
}
