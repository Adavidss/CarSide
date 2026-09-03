import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { appConfig } from '@/config/appConfig';
import type { UserLocation } from '@/models/location';
import type { Density, Settings, ThemePreference } from '@/models/settings';

/** Also read by the inline script in index.html to apply the theme before first paint. */
export const SETTINGS_STORAGE_KEY = 'carside:settings:v1';

function defaultSettings(): Settings {
  return {
    location: { ...appConfig.defaultLocation, source: 'default' },
    radiusMiles: appConfig.defaultRadiusMiles,
    avoidSpoilers: false,
    theme: 'system',
    density: 'comfortable',
    revealedRounds: [],
  };
}

function isLocation(value: unknown): value is UserLocation {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.label === 'string' && Number.isFinite(v.latitude) && Number.isFinite(v.longitude);
}

function loadSettings(): Settings {
  const defaults = defaultSettings();
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      location: isLocation(parsed.location) ? parsed.location : defaults.location,
      radiusMiles:
        typeof parsed.radiusMiles === 'number' && parsed.radiusMiles > 0 ? parsed.radiusMiles : defaults.radiusMiles,
      avoidSpoilers: typeof parsed.avoidSpoilers === 'boolean' ? parsed.avoidSpoilers : defaults.avoidSpoilers,
      theme: parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : 'system',
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      revealedRounds: Array.isArray(parsed.revealedRounds)
        ? parsed.revealedRounds.filter((r): r is string => typeof r === 'string')
        : [],
    };
  } catch {
    return defaults;
  }
}

function persist(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // best effort
  }
}

const THEME_COLORS = { light: '#f4f3ef', dark: '#121314' } as const;

function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);

  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((meta) => {
    const scheme = meta.media?.includes('dark') ? 'dark' : 'light';
    meta.content = theme === 'system' ? THEME_COLORS[scheme] : THEME_COLORS[theme];
  });
}

/** Also applied by the inline script in index.html before first paint. */
function applyDensity(density: Density): void {
  const root = document.documentElement;
  if (density === 'compact') root.setAttribute('data-density', 'compact');
  else root.removeAttribute('data-density');
}

export interface SettingsContextValue {
  settings: Settings;
  setLocation(location: UserLocation): void;
  setRadius(miles: number): void;
  setAvoidSpoilers(value: boolean): void;
  setTheme(theme: ThemePreference): void;
  setDensity(density: Density): void;
  toggleDensity(): void;
  revealRound(season: string, round: number): void;
  isRoundRevealed(season: string, round: number): boolean;
  resetSettings(): void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    persist(settings);
  }, [settings]);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    applyDensity(settings.density);
  }, [settings.density]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      setLocation: (location) => update({ location }),
      setRadius: (radiusMiles) => update({ radiusMiles }),
      setAvoidSpoilers: (avoidSpoilers) => update({ avoidSpoilers }),
      setTheme: (theme) => update({ theme }),
      setDensity: (density) => update({ density }),
      toggleDensity: () =>
        setSettings((prev) => ({ ...prev, density: prev.density === 'compact' ? 'comfortable' : 'compact' })),
      revealRound: (season, round) =>
        setSettings((prev) => {
          const key = `${season}:${round}`;
          if (prev.revealedRounds.includes(key)) return prev;
          return { ...prev, revealedRounds: [...prev.revealedRounds.slice(-20), key] };
        }),
      isRoundRevealed: (season, round) => settings.revealedRounds.includes(`${season}:${round}`),
      resetSettings: () => setSettings(defaultSettings()),
    }),
    [settings, update],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
