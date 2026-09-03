import type { WatchPreference, WatchProviderId } from '@/models/settings';

export interface WatchProvider {
  id: WatchProviderId;
  name: string;
  url: string;
  note: string;
}

/**
 * Broadcasters the Watch button can open. Live race video is exclusively licensed, so
 * CarSide never embeds a stream — it takes you to yours in one tap (universal links open
 * the native app on iPhone).
 */
export const WATCH_PROVIDERS: WatchProvider[] = [
  { id: 'apple-tv', name: 'Apple TV', url: 'https://tv.apple.com/', note: 'The US home of Formula 1 from 2026. Opens the Apple TV app on iPhone.' },
  { id: 'f1tv', name: 'F1 TV', url: 'https://f1tv.formula1.com/', note: 'F1 TV Pro or Premium: live sessions, onboards and live timing.' },
  { id: 'espn', name: 'ESPN', url: 'https://www.espn.com/watch/', note: 'ESPN app where it still carries Formula 1.' },
  { id: 'sky', name: 'Sky Sports F1', url: 'https://www.skysports.com/f1', note: 'UK and Ireland.' },
  { id: 'custom', name: 'Other', url: '', note: 'Any service: paste the page or app link you use.' },
];

/** Free official live timing (needs an F1 account to sign in). */
export const LIVE_TIMING_URL = 'https://www.formula1.com/en/timing/f1-live';

export function getWatchProvider(id: WatchProviderId): WatchProvider {
  return WATCH_PROVIDERS.find((p) => p.id === id) ?? WATCH_PROVIDERS[0];
}

export function resolveWatch(pref: WatchPreference): { name: string; url: string | null } {
  const provider = getWatchProvider(pref.provider);
  if (provider.id === 'custom') {
    const url = (pref.customUrl ?? '').trim();
    return { name: 'your stream', url: /^https?:\/\//i.test(url) ? url : null };
  }
  return { name: provider.name, url: provider.url };
}
