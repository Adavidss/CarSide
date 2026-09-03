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

/** OpenF1 supporter credentials for live timing. Only the token is stored — never the password. */
export interface OpenF1Auth {
  token: string;
  /** Epoch ms when the token expires (decoded from the JWT), if known. */
  expiresAt?: number;
  /** Display only. */
  email?: string;
  refreshToken?: string;
}

export interface FavoriteDriver {
  /** Jolpica driverId, e.g. "norris". */
  id: string;
  /** Three-letter code shared with OpenF1, e.g. "NOR". */
  code: string;
  name: string;
}

export interface Settings {
  location: UserLocation;
  radiusMiles: number;
  avoidSpoilers: boolean;
  theme: ThemePreference;
  density: Density;
  watch: WatchPreference;
  openf1: OpenF1Auth | null;
  favoriteDriver: FavoriteDriver | null;
  /** F1 rounds whose results the user has explicitly revealed while spoiler mode is on. */
  revealedRounds: string[];
}
