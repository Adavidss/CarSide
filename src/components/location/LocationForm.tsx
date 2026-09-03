import { useId, useState, type FormEvent } from 'react';
import { appConfig } from '@/config/appConfig';
import { useSettings } from '@/hooks/useSettings';
import { geocode, reverseGeocode } from '@/services/geocoding';
import { Segmented } from '@/components/ui/Segmented';
import { IconLocate } from '@/components/icons/Icons';

interface LocationFormProps {
  onDone?: () => void;
  showRadius?: boolean;
  autoFocus?: boolean;
}

const RADIUS_OPTIONS = appConfig.radiusOptions.map((miles) => ({ value: miles, label: `${miles} mi` }));

/**
 * Manual location entry (always works) plus optional device geolocation.
 * The current location is never replaced unless a lookup succeeds.
 */
export function LocationForm({ onDone, showRadius = true, autoFocus = false }: LocationFormProps) {
  const { settings, setLocation, setRadius } = useSettings();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<'search' | 'locate' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const inputId = useId();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim() || busy) return;
    setBusy('search');
    setError(null);
    setConfirmation(null);
    try {
      const location = await geocode(query);
      setLocation(location);
      setConfirmation(`Location set to ${location.label}.`);
      setQuery('');
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Location lookup failed.');
    } finally {
      setBusy(null);
    }
  }

  function useMyLocation() {
    if (busy) return;
    if (!('geolocation' in navigator)) {
      setError('This browser does not offer location access. Type a city or ZIP instead.');
      return;
    }
    setBusy('locate');
    setError(null);
    setConfirmation(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const label = await reverseGeocode(latitude, longitude);
        setLocation({ label, latitude, longitude, source: 'device' });
        setConfirmation(`Location set to ${label}.`);
        setBusy(null);
        onDone?.();
      },
      (geoError) => {
        setBusy(null);
        setError(
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Location permission was declined — no problem, type a city or ZIP instead.'
            : 'Could not read your location. Type a city or ZIP instead.',
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }

  return (
    <form className="locform" onSubmit={submit}>
      <div className="field">
        <label htmlFor={inputId} className="label">
          Search for a place
        </label>
        <div className="locform__row">
          <input
            id={inputId}
            className="input"
            type="text"
            inputMode="text"
            autoComplete="off"
            enterKeyHint="search"
            placeholder={settings.location.label}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus={autoFocus}
            aria-describedby={`${inputId}-hint`}
          />
          <button type="submit" className="btn btn--primary" disabled={busy !== null || !query.trim()}>
            {busy === 'search' ? 'Finding…' : 'Set'}
          </button>
        </div>
        <p id={`${inputId}-hint`} className="locform__hint">
          City, ZIP, or “City, ST” — e.g. Raleigh, NC · Durham, NC · 27560
        </p>
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn--ghost btn--sm" onClick={useMyLocation} disabled={busy !== null}>
          <IconLocate />
          {busy === 'locate' ? 'Locating…' : 'Use my location'}
        </button>
        <span className="meta">
          Current: <strong>{settings.location.label}</strong>
        </span>
      </div>

      {showRadius && (
        <div className="locform__radius">
          <span className="label">Radius</span>
          <Segmented options={RADIUS_OPTIONS} value={settings.radiusMiles} onChange={setRadius} ariaLabel="Search radius" size="sm" />
        </div>
      )}

      {error && (
        <p className="locform__error" role="alert">
          {error}
        </p>
      )}
      {confirmation && !error && (
        <p className="meta" role="status">
          {confirmation}
        </p>
      )}
    </form>
  );
}
