import { useCallback, useEffect, useRef, useState } from 'react';
import type { Loaded, LoadSource } from '@/services/cache';

export type ResourceStatus = 'loading' | 'ready' | 'error';

export interface Resource<T> {
  status: ResourceStatus;
  data?: T;
  error?: string;
  /** Network timestamp of the data; null for bundled fallbacks or while loading. */
  updatedAt: number | null;
  source?: LoadSource;
  /** True when the data could not be refreshed and may be out of date. */
  stale: boolean;
  reload(): void;
}

interface Options {
  /** Re-run the loader when the tab becomes visible again (cheap when the cache is fresh). */
  refreshOnVisible?: boolean;
}

/**
 * Runs a `Loaded<T>`-returning loader with abort-on-change semantics and exposes
 * freshness metadata so screens can show "may be out of date" honestly.
 */
export function useLoaded<T>(
  loader: (signal: AbortSignal) => Promise<Loaded<T>>,
  deps: readonly unknown[],
  options: Options = {},
): Resource<T> {
  const [state, setState] = useState<Omit<Resource<T>, 'reload'>>({ status: 'loading', updatedAt: null, stale: false });
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setState((prev) => (prev.status === 'ready' ? prev : { status: 'loading', updatedAt: null, stale: false }));

    loaderRef
      .current(controller.signal)
      .then((loaded) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          data: loaded.data,
          updatedAt: loaded.updatedAt,
          source: loaded.source,
          stale: loaded.stale,
          error: loaded.error,
        });
      })
      .catch((err: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        setState((prev) => ({
          status: prev.data !== undefined ? 'ready' : 'error',
          data: prev.data,
          updatedAt: prev.updatedAt,
          source: prev.source,
          stale: true,
          error: err instanceof Error ? err.message : String(err),
        }));
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!options.refreshOnVisible) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [options.refreshOnVisible, reload]);

  return { ...state, reload };
}
