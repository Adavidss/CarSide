import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { appConfig } from '@/config/appConfig';
import { useNow } from '@/hooks/useNow';
import { useNearbyEvents } from '@/hooks/useEvents';
import { useEventWeather } from '@/hooks/useWeather';
import { useSettings } from '@/hooks/useSettings';
import { useLocationPanel } from '@/hooks/useLocationPanel';
import { curatedFeed } from '@/services/events/providers/curated';
import { buildTimeline } from '@/utils/timeline';
import { addDays, dayKey, endOfDay, formatDateSpan, getWeekendWindow, startOfDay } from '@/utils/dates';
import { EVENT_GROUP_OPTIONS, eventGroup, type EventGroup } from '@/utils/eventTypes';
import { Timeline } from '@/components/events/Timeline';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { LocationLine } from '@/components/location/LocationLine';

type Range = 'weekend' | 'next' | '30' | '90';

const RANGE_OPTIONS: Array<{ value: Range; label: string }> = [
  { value: 'weekend', label: 'This weekend' },
  { value: 'next', label: 'Next weekend' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

/** `label` heads the section; `phrase` completes the sentence "…for {phrase}". */
function rangeWindow(range: Range, now: Date): { from: Date; to: Date; label: string; phrase: string } {
  const win = getWeekendWindow(now);
  switch (range) {
    case 'weekend':
      return {
        from: startOfDay(now),
        to: win.end,
        label: win.label,
        phrase: win.label === 'This weekend' ? 'this weekend' : 'the coming weekend',
      };
    case 'next':
      return { from: win.nextWeekendStart, to: win.nextWeekendEnd, label: 'Next weekend', phrase: 'next weekend' };
    case '90':
      return { from: startOfDay(now), to: endOfDay(addDays(now, 90)), label: 'Next 90 days', phrase: 'the next 90 days' };
    default:
      return {
        from: startOfDay(now),
        to: endOfDay(addDays(now, appConfig.nearbyLookaheadDays)),
        label: 'Next 30 days',
        phrase: 'the next 30 days',
      };
  }
}

export function NearbyPage() {
  const now = useNow(60_000);
  const todayKey = dayKey(now);
  const [params, setParams] = useSearchParams();
  const range = (RANGE_OPTIONS.some((o) => o.value === params.get('range')) ? params.get('range') : '30') as Range;
  const group = (EVENT_GROUP_OPTIONS.some((o) => o.value === params.get('type')) ? params.get('type') : 'all') as EventGroup;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const window = useMemo(() => rangeWindow(range, now), [range, todayKey]);
  const { settings, setRadius } = useSettings();
  const { openPanel } = useLocationPanel();
  const events = useNearbyEvents(window.from, window.to);

  const filtered = useMemo(
    () => (events.data?.events ?? []).filter((e) => group === 'all' || eventGroup(e.type) === group),
    [events.data, group],
  );
  const items = useMemo(() => buildTimeline({ events: filtered, from: window.from, to: window.to }), [filtered, window]);
  const weather = useEventWeather(filtered);
  const largerRadius = appConfig.radiusOptions.find((r) => r > settings.radiusMiles);
  const beyond = events.data?.beyondRadius.length ?? 0;

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  }

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <p className="label label--lg">Nearby</p>
          <h1 className="page__title">Car events near you</h1>
        </div>
        <LocationLine />
      </header>

      <div className="filters">
        <div className="filter-scroll">
          <Segmented options={EVENT_GROUP_OPTIONS} value={group} onChange={(v) => update('type', v)} ariaLabel="Event type" size="sm" />
        </div>
        <div className="filter-scroll">
          <Segmented options={RANGE_OPTIONS} value={range} onChange={(v) => update('range', v)} ariaLabel="Date range" size="sm" />
        </div>
      </div>

      <section className="section section--tight">
        <SectionHeading
          title={window.label}
          meta={`${formatDateSpan(window.from, window.to)} · ${items.length} ${items.length === 1 ? 'event' : 'events'}`}
        />
        {events.status === 'loading' ? (
          <Skeleton variant="row" count={5} label="Finding events" />
        ) : items.length > 0 ? (
          <Timeline items={items} now={now} weather={weather} />
        ) : (
          <div className="empty">
            <h3 className="empty__title">Nothing nearby yet</h3>
            <p className="empty__text">
              We couldn't find {group === 'all' ? 'an automotive event' : `a ${EVENT_GROUP_OPTIONS.find((o) => o.value === group)?.label.toLowerCase()} event`} within{' '}
              {settings.radiusMiles} miles of {settings.location.label} for {window.phrase}.
              {beyond > 0 && ` ${beyond} ${beyond === 1 ? 'event is' : 'events are'} further out.`}
            </p>
            <div className="btn-row">
              {largerRadius && (
                <button type="button" className="btn btn--sm" onClick={() => setRadius(largerRadius)}>
                  Expand to {largerRadius} mi
                </button>
              )}
              <button type="button" className="btn btn--ghost btn--sm" onClick={openPanel}>
                Change location
              </button>
              {range !== '90' && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => update('range', range === 'weekend' ? 'next' : '90')}>
                  {range === 'weekend' ? 'Browse next weekend' : 'Look 90 days ahead'}
                </button>
              )}
              {group !== 'all' && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => update('type', 'all')}>
                  Show all types
                </button>
              )}
            </div>
          </div>
        )}
        {events.status === 'error' && <p className="notice notice--error">Events could not be loaded: {events.error}</p>}
        {items.length > 0 && beyond > 0 && largerRadius && (
          <div className="section__foot">
            <span>
              {beyond} more {beyond === 1 ? 'event' : 'events'} beyond {settings.radiusMiles} mi.
            </span>
            <button type="button" className="btn btn--link" onClick={() => setRadius(largerRadius)}>
              Expand to {largerRadius} mi
            </button>
          </div>
        )}
      </section>

      <div className="sources">
        <span className="label">Sources</span>
        {events.data?.reports.map((report) => (
          <span key={report.providerId}>
            {report.providerName}
            {report.error ? ` — unavailable (${report.error})` : ` — ${report.count} ${report.count === 1 ? 'entry' : 'entries'} in range`}
          </span>
        ))}
        <span>
          Curated list last updated {curatedFeed.updated ?? 'recently'}. Distances are straight-line. Recurring meets follow the organizer's usual
          pattern — confirm the date on their page before driving out.
        </span>
      </div>
    </div>
  );
}
