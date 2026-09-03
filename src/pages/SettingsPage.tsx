import { useState, type FormEvent } from 'react';
import { appConfig } from '@/config/appConfig';
import { useSettings } from '@/hooks/useSettings';
import { useSaved } from '@/hooks/useSaved';
import type { Density, ThemePreference, WatchProviderId } from '@/models/settings';
import { WATCH_PROVIDERS, getWatchProvider } from '@/services/f1/watch';
import { authFromPastedToken, isTokenExpired, loginOpenF1, tokenMinutesLeft } from '@/services/f1/openf1Auth';
import { useDriverStandings } from '@/hooks/useF1';
import { clearAllCaches } from '@/services/cache';
import { providers } from '@/services/events/registry';
import { curatedFeed } from '@/services/events/providers/curated';
import { circuitAttribution } from '@/services/f1/attribution';
import { LocationForm } from '@/components/location/LocationForm';
import { Segmented } from '@/components/ui/Segmented';
import { Switch } from '@/components/ui/Switch';

const RADIUS_OPTIONS = appConfig.radiusOptions.map((miles) => ({ value: miles, label: `${miles} mi` }));
const WATCH_OPTIONS: Array<{ value: WatchProviderId; label: string }> = WATCH_PROVIDERS.map((p) => ({ value: p.id, label: p.name }));
const DENSITY_OPTIONS: Array<{ value: Density; label: string }> = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
];
const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsPage() {
  const { settings, setRadius, setAvoidSpoilers, setTheme, setDensity, setWatch, setOpenF1, setFavoriteDriver, resetSettings } = useSettings();
  const watchProvider = getWatchProvider(settings.watch.provider);
  const driverStandings = useDriverStandings();
  const [email, setEmail] = useState(settings.openf1?.email ?? '');
  const [password, setPassword] = useState('');
  const [pasted, setPasted] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const tokenExpired = isTokenExpired(settings.openf1);
  const minutesLeft = tokenMinutesLeft(settings.openf1);

  async function connect(event: FormEvent) {
    event.preventDefault();
    if (authBusy || !email.trim() || !password) return;
    setAuthBusy(true);
    setAuthError(null);
    setAuthNote(null);
    try {
      const auth = await loginOpenF1(email, password);
      setOpenF1(auth);
      setPassword('');
      setAuthNote('Connected. Live timing will use this token during sessions.');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Could not connect to OpenF1.');
    } finally {
      setAuthBusy(false);
    }
  }

  function savePasted() {
    setAuthError(null);
    setAuthNote(null);
    try {
      setOpenF1(authFromPastedToken(pasted));
      setPasted('');
      setAuthNote('Token saved.');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Invalid token.');
    }
  }
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
          <div>
            <p className="label" style={{ marginBottom: 6 }}>
              Where you watch
            </p>
            <div className="filter-scroll">
              <Segmented options={WATCH_OPTIONS} value={settings.watch.provider} onChange={(provider) => setWatch({ ...settings.watch, provider })} ariaLabel="Where you watch" size="sm" />
            </div>
          </div>
          {settings.watch.provider === 'custom' && (
            <div className="field">
              <label htmlFor="watch-url" className="label">
                Stream link
              </label>
              <input
                id="watch-url"
                className="input"
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={settings.watch.customUrl ?? ''}
                onChange={(e) => setWatch({ ...settings.watch, customUrl: e.target.value })}
              />
            </div>
          )}
          <p className="settings__hint">
            {watchProvider.note} When a session is live or about to start, Home and the F1 page show a one-tap Watch button that opens it. Race
            video is exclusively licensed, so CarSide links to your service rather than embedding a stream.
          </p>

          <div className="settings__sub">
            <p className="label" style={{ marginBottom: 6 }}>
              Live timing · OpenF1 supporter account
            </p>
            {settings.openf1 && (
              <div className="settings__row">
                <span>
                  Connected{settings.openf1.email ? ` as ${settings.openf1.email}` : ''}
                  <span className="settings__hint" style={{ display: 'block' }}>
                    {tokenExpired ? 'Token expired — reconnect before the next session.' : minutesLeft !== null ? `Token valid for about ${minutesLeft} min.` : 'Token saved on this device.'}
                  </span>
                </span>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpenF1(null)}>
                  Disconnect
                </button>
              </div>
            )}
            <form className="locform" onSubmit={connect}>
              <div className="locform__row locform__row--wrap">
                <input className="input" type="email" autoComplete="username" placeholder="OpenF1 account email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="OpenF1 email" />
                <input className="input" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="OpenF1 password" />
                <button type="submit" className="btn btn--primary" disabled={authBusy || !email.trim() || !password}>
                  {authBusy ? 'Connecting…' : settings.openf1 ? 'Reconnect' : 'Connect'}
                </button>
              </div>
            </form>
            <details className="settings__details">
              <summary>Paste a token instead</summary>
              <div className="locform__row" style={{ marginTop: 8 }}>
                <input className="input" type="text" spellCheck={false} placeholder="eyJ…" value={pasted} onChange={(e) => setPasted(e.target.value)} aria-label="OpenF1 token" />
                <button type="button" className="btn" onClick={savePasted} disabled={!pasted.trim()}>
                  Save token
                </button>
              </div>
            </details>
            {authError && (
              <p className="locform__error" role="alert">
                {authError}
              </p>
            )}
            {authNote && !authError && (
              <p className="meta" role="status">
                {authNote}
              </p>
            )}
            <p className="settings__hint">
              Real-time data on OpenF1 is a supporter feature (about €10 a month at{' '}
              <a className="link" href="https://openf1.org/" target="_blank" rel="noreferrer">
                openf1.org
              </a>
              ); replays of finished sessions are free for everyone. Your email and password go straight to OpenF1 over HTTPS and are never stored —
              only the returned token is, on this device. Tokens last about an hour, so reconnect shortly before a session.
            </p>
          </div>

          <div>
            <p className="label" style={{ marginBottom: 6 }}>
              Your driver
            </p>
            <select
              className="select"
              value={settings.favoriteDriver?.id ?? ''}
              aria-label="Your driver"
              onChange={(e) => {
                const d = driverStandings.data?.entries.find((x) => x.driverId === e.target.value);
                setFavoriteDriver(d ? { id: d.driverId, code: d.code, name: `${d.givenName} ${d.familyName}` } : null);
              }}
            >
              <option value="">None</option>
              {driverStandings.data?.entries.map((d) => (
                <option key={d.driverId} value={d.driverId}>
                  {d.givenName} {d.familyName} · {d.constructorName}
                </option>
              ))}
            </select>
            <p className="settings__hint">Highlighted in the standings, the title race, live timing and replays.</p>
          </div>
        </div>
      </section>

      <section className="settings__group">
        <h2 className="settings__title">Appearance</h2>
        <div className="settings__body">
          <Segmented options={THEME_OPTIONS} value={settings.theme} onChange={setTheme} ariaLabel="Appearance" />
          <div>
            <p className="label" style={{ marginBottom: 6 }}>
              Density
            </p>
            <Segmented options={DENSITY_OPTIONS} value={settings.density} onChange={setDensity} ariaLabel="Density" />
          </div>
          <p className="settings__hint">
            Compact puts each event on one line and shrinks Next Up for a quick scan at a show. The lines button in the header toggles it too.
          </p>
        </div>
      </section>

      <section className="settings__group">
        <h2 className="settings__title">On your iPhone</h2>
        <div className="settings__body">
          <p className="settings__hint" style={{ maxWidth: '64ch' }}>
            Add CarSide to your Home Screen for a full-screen app with its own icon: open this page in Safari, tap <strong>Share</strong>, then{' '}
            <strong>Add to Home Screen</strong>. Schedules and the last forecasts stay available offline.
          </p>
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
              Reset location, radius, spoiler, watch, density and appearance settings
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
            , converted to your local time zone. Race replays are built from the{' '}
            <a className="link" href="https://openf1.org/" target="_blank" rel="noreferrer">
              OpenF1 API
            </a>{' '}
            once a session has ended.
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
          <p>
            <strong>Photographs</strong> — circuit and driver pictures come from Wikipedia articles and the daily frame from Wikimedia Commons'
            featured automobile photographs. Each image shows its photographer and licence (CC BY, CC BY-SA or public domain) and links to the file
            page.
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
