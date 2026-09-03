import { getCircuitWinners, getConstructorStandings, getDriverSeasonResults, getDriverStandings, getLastResult, getQualifying, getSchedule } from '@/services/f1';
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

export function useDriverSeasonResults(driverId: string | undefined) {
  return useLoaded((signal) => (driverId ? getDriverSeasonResults(driverId, signal) : Promise.reject(new Error('no driver'))), [driverId]);
}

export function useQualifying(season: string | undefined, round: number | undefined) {
  return useLoaded(
    (signal) => (season && round ? getQualifying(season, round, signal) : Promise.reject(new Error('no round'))),
    [season, round],
  );
}

export function useCircuitWinners(circuitId: string | undefined) {
  return useLoaded((signal) => (circuitId ? getCircuitWinners(circuitId, signal) : Promise.reject(new Error('no circuit'))), [circuitId]);
}
