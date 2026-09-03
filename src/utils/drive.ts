/**
 * Rough drive-time estimate from straight-line distance. No routing data is available to a
 * static site, so this assumes typical road factors and speeds and says so in the UI.
 */
export function estimateDriveMinutes(straightLineMiles: number): number {
  const road = straightLineMiles * 1.25;
  const mph = road < 8 ? 26 : road < 30 ? 36 : road < 80 ? 48 : 58;
  return Math.max(3, Math.round((road / mph) * 60 + 4));
}

/** When to leave to arrive `bufferMinutes` early. */
export function leaveBy(start: Date, straightLineMiles: number, bufferMinutes = 10): Date {
  return new Date(start.getTime() - (estimateDriveMinutes(straightLineMiles) + bufferMinutes) * 60_000);
}
