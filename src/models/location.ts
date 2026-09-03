export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** The user's selected home location. */
export interface UserLocation extends GeoPoint {
  /** Human-readable label, e.g. "Morrisville, NC 27560". */
  label: string;
  /** Where the coordinates came from — useful for showing "approximate" hints. */
  source?: 'default' | 'geocoded' | 'device';
}
