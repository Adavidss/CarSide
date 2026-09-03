import { useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SettingsProvider } from '@/hooks/useSettings';
import { SavedProvider } from '@/hooks/useSaved';
import { LocationPanelProvider, useLocationPanel } from '@/hooks/useLocationPanel';
import { AppShell } from '@/components/layout/AppShell';
import { HomePage } from '@/pages/HomePage';
import { F1Page } from '@/pages/F1Page';
import { NearbyPage } from '@/pages/NearbyPage';
import { EventDetailPage } from '@/pages/EventDetailPage';
import { SavedPage } from '@/pages/SavedPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

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

/**
 * HashRouter keeps deep links and refreshes working on GitHub Pages, which has no
 * server-side rewrite for SPA routes.
 */
export function App() {
  return (
    <SettingsProvider>
      <SavedProvider>
        <LocationPanelProvider>
          <HashRouter>
            <RouteEffects />
            <AppShell>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/f1" element={<F1Page />} />
                <Route path="/nearby" element={<NearbyPage />} />
                <Route path="/nearby/:id" element={<EventDetailPage />} />
                <Route path="/saved" element={<SavedPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </AppShell>
          </HashRouter>
        </LocationPanelProvider>
      </SavedProvider>
    </SettingsProvider>
  );
}
