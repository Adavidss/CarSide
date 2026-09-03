export type WatchabilityKey = 'easy' | 'early' | 'alarm' | 'late' | 'brutal';
export type WatchabilityTone = 'ok' | 'warn' | 'late' | 'bad';

export interface Watchability {
  key: WatchabilityKey;
  label: string;
  tone: WatchabilityTone;
  note: string;
}

const LEVELS: Record<WatchabilityKey, Watchability> = {
  easy: { key: 'easy', label: 'Easy watch', tone: 'ok', note: 'Coffee, not alarms.' },
  early: { key: 'early', label: 'Early start', tone: 'warn', note: 'One alarm should do it.' },
  alarm: { key: 'alarm', label: 'Alarm clock territory', tone: 'late', note: 'Set two alarms.' },
  late: { key: 'late', label: 'Late night', tone: 'warn', note: 'Stay up or catch the replay.' },
  brutal: { key: 'brutal', label: 'Absolutely brutal', tone: 'bad', note: 'Respect if you make it.' },
};

/**
 * How painful a session is to watch live, based purely on the local start time.
 * A small bit of personality — not a recommendation engine.
 */
export function getWatchability(localStart: Date): Watchability {
  const hour = localStart.getHours() + localStart.getMinutes() / 60;
  if (hour >= 8 && hour < 21) return LEVELS.easy;
  if (hour >= 6.5 && hour < 8) return LEVELS.early;
  if (hour >= 4.5 && hour < 6.5) return LEVELS.alarm;
  if (hour >= 21) return LEVELS.late;
  return LEVELS.brutal;
}
