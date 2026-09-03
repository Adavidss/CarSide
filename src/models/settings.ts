import type { UserLocation } from './location';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Comfortable = default spacing; compact = one line per event for a quick scan. */
export type Density = 'comfortable' | 'compact';

export type WatchProviderId = 'apple-tv' | 'f1tv' | 'espn' | 'sky' | 'custom';

/** Where the user watches F1 — the Race Day "Watch" button deep-links here. */
export interface WatchPreference {
  provider: WatchProviderId;
  customUrl?: string;
}

export interface Settings {
  location: UserLocation;
  radiusMiles: number;
  avoidSpoilers: boolean;
  theme: ThemePreference;
  density: Density;
  watch: WatchPreference;
  /** F1 rounds whose results the user has explicitly revealed while spoiler mode is on. */
  revealedRounds: string[];
}
