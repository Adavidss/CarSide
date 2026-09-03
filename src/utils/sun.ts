/**
 * Sunrise / sunset from the standard "sunrise equation" (NOAA-style, ±3 min).
 * Used for meet-morning light: golden hour matters when you're photographing cars.
 */
const RAD = Math.PI / 180;
const J2000 = 2451545.0;
const JULIAN_EPOCH_MS = 2440587.5; // Julian day at Unix epoch

function toJulian(date: Date): number {
  return date.getTime() / 86_400_000 + JULIAN_EPOCH_MS;
}

function fromJulian(j: number): Date {
  return new Date((j - JULIAN_EPOCH_MS) * 86_400_000);
}

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
}

/** Sunrise and sunset on the local calendar day of `date` at the given coordinates, or null near the poles. */
export function sunTimes(date: Date, latitude: number, longitude: number): SunTimes | null {
  const localNoon = new Date(date);
  localNoon.setHours(12, 0, 0, 0);
  const n = Math.round(toJulian(localNoon) - J2000 + 0.0008);
  const meanSolarNoon = n - longitude / 360;
  const meanAnomaly = (357.5291 + 0.98560028 * meanSolarNoon) % 360;
  const center = 1.9148 * Math.sin(meanAnomaly * RAD) + 0.02 * Math.sin(2 * meanAnomaly * RAD) + 0.0003 * Math.sin(3 * meanAnomaly * RAD);
  const eclipticLongitude = (meanAnomaly + center + 180 + 102.9372) % 360;
  const transit = J2000 + meanSolarNoon + 0.0053 * Math.sin(meanAnomaly * RAD) - 0.0069 * Math.sin(2 * eclipticLongitude * RAD);
  const declination = Math.asin(Math.sin(eclipticLongitude * RAD) * Math.sin(23.4397 * RAD));
  const cosHourAngle = (Math.sin(-0.833 * RAD) - Math.sin(latitude * RAD) * Math.sin(declination)) / (Math.cos(latitude * RAD) * Math.cos(declination));
  if (cosHourAngle < -1 || cosHourAngle > 1) return null;
  const hourAngle = Math.acos(cosHourAngle) / RAD;
  return { sunrise: fromJulian(transit - hourAngle / 360), sunset: fromJulian(transit + hourAngle / 360) };
}

export const GOLDEN_HOUR_MS = 60 * 60_000;

export type LightNote = { kind: 'morning'; until: Date } | { kind: 'evening'; from: Date } | null;

/** Whether an event's start sits in soft morning or evening light. */
export function lightNote(start: Date, sun: SunTimes | null): LightNote {
  if (!sun) return null;
  const t = start.getTime();
  if (t >= sun.sunrise.getTime() - 20 * 60_000 && t <= sun.sunrise.getTime() + 2 * GOLDEN_HOUR_MS) {
    return { kind: 'morning', until: new Date(sun.sunrise.getTime() + GOLDEN_HOUR_MS) };
  }
  if (t >= sun.sunset.getTime() - 2.5 * GOLDEN_HOUR_MS && t <= sun.sunset.getTime() + 20 * 60_000) {
    return { kind: 'evening', from: new Date(sun.sunset.getTime() - GOLDEN_HOUR_MS) };
  }
  return null;
}
