/**
 * First-run message. CarSide started life as a birthday present; this is the only
 * place that shows. It appears exactly once, and dismissal is remembered in localStorage.
 *
 * To remove it entirely: set `enabled` to false (or delete this file and the
 * <BirthdaySplash /> usage in src/App.tsx).
 * To show it again on a device: clear the `storageKey` entry from localStorage,
 * or bump the key (e.g. "…:v2").
 */
export const birthdayConfig = {
  enabled: true,
  storageKey: 'carside:first-run-dismissed:v1',
  heading: 'Happy Birthday.',
  message: 'I made you something for finding excuses to go look at cars.',
  cta: 'Open CarSide',
} as const;
