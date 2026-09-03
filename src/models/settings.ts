import type { UserLocation } from './location';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  location: UserLocation;
  radiusMiles: number;
  avoidSpoilers: boolean;
  theme: ThemePreference;
  /** F1 rounds whose results the user has explicitly revealed while spoiler mode is on. */
  revealedRounds: string[];
}
