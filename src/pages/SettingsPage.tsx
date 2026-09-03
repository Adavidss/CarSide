import { useState } from 'react';
import { appConfig } from '@/config/appConfig';
import { useSettings } from '@/hooks/useSettings';
import { useSaved } from '@/hooks/useSaved';
import type { ThemePreference } from '@/models/settings';
import { clearAllCaches } from '@/services/cache';
import { providers } from '@/services/events/registry';
import { curatedFeed } from '@/services/events/providers/curated';
import { circuitAttribution } from '@/components/f1/CircuitOutline';
import { LocationForm } from '@/components/location/LocationForm';
import { Segmented } from '@/components/ui/Segmented';
import { Switch } from '@/components/ui/Switch';

const RADIUS_OPTIONS = appConfig.radiusOptions.map((miles) => ({ value: miles, label: `${miles} mi` }));
const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsPage() {
  const { settings, setRadius, setAvoidSpoilers, setTheme, resetSettings } = useSettings();
  const { saved } = useSaved();
  const [cleared, setCleared] = useState<number | null>(null);

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <p className="label label--lg">Settings</p>
          <h1 className="page__title">Set up once, forget it</h1>
        </div>
        <p className="page__context">
          <span>Everything is stored on this device</span>
        </p>
      </header>

      <section className="settings__group">
        <h2 className="settings__title">Location</h2>
        <div className="settings__body">
          <LocationForm showRadius={false} />
        </div>
      </section>

      <section className="settings__group">
        <h2 className="settings__title">Search radius</h2>
        <div className="settings__body">
          <Segmented options={RADIUS_OPTIONS} value={settings.radiusMiles} onChange={setRadius} ariaLabel="Search radius" />
          <p className="settings__hint">Straight-line distance from {settings.location.label}. 50 miles covers the whole Triangle; 100+ reaches VIR, Rockingham and the Charlotte area.</p>
        </div>
      </section>

      <section className="settings__group">
        <h2 className="settings__title">Formula 1</h2>
        <div className="settings__body">
          <Switch checked={settings.avoidSpoilers} onChange={setAvoidSpoilers} label="Avoid spoilers" describedBy="spoiler-hint" />
          <p id="spoiler-hint" className="settings__hint">
            Hides race results and championship standings until you tap Reveal. Session times and schedules stay visible.
          </p>
        </div>
      </section>

      <section className="settings__group">
        <h2 className="settings__title">Appearance</h2>
        <div className="settings__body">
          <Segmented options={THEME_OPTIONS} value={settings.theme} onChange={setTheme} ariaLabel="Appearance" />
        </div>
      </section>

      <section className="settings__group">
        <h2 className="settings__title">Data</h2>
        <div className="settings__body">
          <div className="settings__row">
            <span>
              Cached schedules, standings, forecasts and geocoding
              <span className="settings__hint" style={{ display: 'block' }}>
                Refreshed automatically. Clear if something looks stuck.
              </span>
            </span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setCleared(clearAllCaches());
              }}
            >
              {cleared === null ? 'Clear cached data' : `Cleared ${cleared} ${cleared === 1 ? 'entry' : 'entries'}`}
            </button>
          </div>
          <div className="settings__row">
            <span>
              Reset location, radius, spoiler and appearance settings
              <span className="settings__hint" style={{ display: 'block' }}>
                Saved events ({saved.length}) are kept.
              </span>
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetSettings}>
              Reset to defaults
            </button>
          </div>
        </div>
      </section>

      <section className="settings__group">
        <h2 className="settings__title">Sources</h2>
        <div className="settings__body about-list">
          <p>
            <strong>Formula 1</strong> — schedule, standings and results from the{' '}
            <a className="link" href="https://api.jolpi.ca/" target="_blank" rel="noreferrer">
              Jolpica F1 API
            </a>
            , converted to your local time zone.
          </p>
          <p>
            <strong>Local events</strong> —{' '}
            {providers.map((p) => p.name).join(', ')} (curated list updated {curatedFeed.updated ?? 'recently'}). Each listing links to the
            organizer's page; recurring meets follow their published pattern, so confirm before you go.
          </p>
          <p>
            <strong>Weather</strong> — hourly forecasts from{' '}
            <a className="link" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>
            , shown for events inside the 16-day forecast window.
          </p>
          <p>
            <strong>Locations</strong> — geocoding by OpenStreetMap Nominatim, Open-Meteo and Zippopotam.us. Distances are straight-line, not
            driving distance.
          </p>
          <p>
            <strong>Circuits</strong> — {circuitAttribution}
          </p>
          <p>{appConfig.f1.disclaimer}</p>
          <p>
            <a className="link" href={appConfig.repoUrl} target="_blank" rel="noreferrer">
              CarSide on GitHub
            </a>{' '}
            · v1.0
          </p>
        </div>
      </section>
    </div>
  );
}
