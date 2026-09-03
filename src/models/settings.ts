import type { UserLocation } from './location';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Comfortable = default spacing; compact = one line per event for a quick scan. */
export type Density = 'comfortable' | 'compact';

export interface Settings {
  location: UserLocation;
  radiusMiles: number;
  avoidSpoilers: boolean;
  theme: ThemePreference;
  density: Density;
  /** F1 rounds whose results the user has explicitly revealed while spoiler mode is on. */
  revealedRounds: string[];
}
