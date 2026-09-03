import { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SettingsProvider } from '@/hooks/useSettings';
import { SavedProvider } from '@/hooks/useSaved';
import { LocationPanelProvider, useLocationPanel } from '@/hooks/useLocationPanel';
import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { HomePage } from '@/pages/HomePage';
import { NearbyPage } from '@/pages/NearbyPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

/*
 * Home and Nearby ship in the main bundle — they are the screens people open at a
 * car show. The rest load on demand (and are prefetched once the app is idle), which
 * keeps the first paint on a phone small: circuit outlines, standings tables and the
 * settings form only arrive when needed.
 */
const loadF1 = () => import('@/pages/F1Page');
const loadEventDetail = () => import('@/pages/EventDetailPage');
const loadSaved = () => import('@/pages/SavedPage');
const loadSettings = () => import('@/pages/SettingsPage');

const F1Page = lazy(() => loadF1().then((m) => ({ default: m.F1Page })));
const EventDetailPage = lazy(() => loadEventDetail().then((m) => ({ default: m.EventDetailPage })));
const SavedPage = lazy(() => loadSaved().then((m) => ({ default: m.SavedPage })));
const SettingsPage = lazy(() => loadSettings().then((m) => ({ default: m.SettingsPage })));

function PageFallback() {
  return (
    <div className="page" aria-busy="true">
      <Skeleton variant="text" width="30%" />
      <div style={{ height: 12 }} />
      <Skeleton variant="title" width="55%" />
      <div style={{ height: 24 }} />
      <Skeleton variant="row" count={4} label="Loading" />
    </div>
  );
}

/** Scroll to the top and close transient UI on navigation. */
function RouteEffects() {
  const { pathname } = useLocation();
  const { closePanel } = useLocationPanel();
  useEffect(() => {
    window.scrollTo({ top: 0 });
    closePanel();
  }, [pathname, closePanel]);
  return null;
}

/** Warm the lazy chunks after first paint so navigation feels instant. */
function usePrefetchRoutes() {
  useEffect(() => {
    const run = () => {
      void loadF1();
      void loadEventDetail();
      void loadSaved();
      void loadSettings();
    };
    // Safari has no requestIdleCallback; typed as optional so the fallback branch stays reachable.
    const w = window as Window & {
      requestIdleCallback?: typeof window.requestIdleCallback;
      cancelIdleCallback?: typeof window.cancelIdleCallback;
    };
    if (w.requestIdleCallback && w.cancelIdleCallback) {
      const id = w.requestIdleCallback(run, { timeout: 4000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(run, 1500);
    return () => window.clearTimeout(timer);
  }, []);
}

/**
 * HashRouter keeps deep links and refreshes working on GitHub Pages, which has no
 * server-side rewrite for SPA routes.
 */
export function App() {
  usePrefetchRoutes();
  return (
    <SettingsProvider>
      <SavedProvider>
        <LocationPanelProvider>
          <HashRouter>
            <RouteEffects />
            <AppShell>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/f1" element={<F1Page />} />
                  <Route path="/nearby" element={<NearbyPage />} />
                  <Route path="/nearby/:id" element={<EventDetailPage />} />
                  <Route path="/saved" element={<SavedPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </AppShell>
          </HashRouter>
        </LocationPanelProvider>
      </SavedProvider>
    </SettingsProvider>
  );
}
