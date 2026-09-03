import { getConstructorStandings, getDriverStandings, getLastResult, getSchedule } from '@/services/f1';
import { useLoaded } from './useResource';

export function useF1Schedule() {
  return useLoaded((signal) => getSchedule(signal), [], { refreshOnVisible: true });
}

export function useDriverStandings(enabled = true) {
  return useLoaded(
    (signal) => (enabled ? getDriverStandings(signal) : Promise.reject(new Error('disabled'))),
    [enabled],
  );
}

export function useConstructorStandings(enabled = true) {
  return useLoaded(
    (signal) => (enabled ? getConstructorStandings(signal) : Promise.reject(new Error('disabled'))),
    [enabled],
  );
}

export function useLastResult(enabled = true) {
  return useLoaded((signal) => (enabled ? getLastResult(signal) : Promise.reject(new Error('disabled'))), [enabled]);
}
