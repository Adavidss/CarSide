import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSaved } from '@/hooks/useSaved';
import { useNow } from '@/hooks/useNow';
import { useSettings } from '@/hooks/useSettings';
import { useEventWeather } from '@/hooks/useWeather';
import type { EventWithDistance } from '@/models/events';
import { haversineMiles } from '@/utils/distance';
import { buildTimeline } from '@/utils/timeline';
import { DAY_MS } from '@/utils/dates';
import { Timeline } from '@/components/events/Timeline';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { IconTrash } from '@/components/icons/Icons';

export function SavedPage() {
  const now = useNow(60_000);
  const { saved, remove, clearPast } = useSaved();
  const { settings } = useSettings();

  const events = useMemo<EventWithDistance[]>(
    () =>
      saved.map(({ event }) => ({
        ...event,
        distanceMiles:
          event.latitude != null && event.longitude != null
            ? haversineMiles(settings.location, { latitude: event.latitude, longitude: event.longitude })
            : undefined,
      })),
    [saved, settings.location],
  );

  const upcoming = useMemo(
    () => buildTimeline({ events: events.filter((e) => new Date(e.end ?? e.start).getTime() >= now.getTime()), from: new Date(0), to: new Date(now.getTime() + 400 * DAY_MS) }),
    [events, now],
  );
  const past = useMemo(
    () =>
      buildTimeline({ events: events.filter((e) => new Date(e.end ?? e.start).getTime() < now.getTime()), from: new Date(0), to: now }).reverse(),
    [events, now],
  );
  const weather = useEventWeather(events);

  const removeButton = (id: string, title: string) => (
    <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label={`Remove ${title}`} title="Remove" onClick={() => remove(id)}>
      <IconTrash />
    </button>
  );

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <p className="label label--lg">Saved</p>
          <h1 className="page__title">Your shortlist</h1>
        </div>
        <p className="page__context">
          <span>
            {saved.length} {saved.length === 1 ? 'event' : 'events'}
          </span>
          <span aria-hidden="true">·</span>
          <span>Stored on this device</span>
        </p>
      </header>

      <section className="section section--tight">
        <SectionHeading title="Upcoming" meta={`${upcoming.length}`} />
        {upcoming.length > 0 ? (
          <Timeline items={upcoming} now={now} weather={weather} renderExtraAction={(item) => removeButton(item.id, item.kind === 'event' ? item.event.title : '')} />
        ) : (
          <div className="empty">
            <h3 className="empty__title">Nothing saved yet</h3>
            <p className="empty__text">Tap the bookmark on any event to keep it here. Saved events stay on this device — no account needed.</p>
            <Link to="/nearby" className="btn btn--sm">
              Browse nearby events
            </Link>
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="section">
          <SectionHeading
            title="Past"
            meta={`${past.length}`}
            actions={
              <button type="button" className="btn btn--link" onClick={() => clearPast(now)} style={{ marginLeft: 12 }}>
                Clear past
              </button>
            }
          />
          <Timeline items={past} now={now} renderExtraAction={(item) => removeButton(item.id, item.kind === 'event' ? item.event.title : '')} />
        </section>
      )}
    </div>
  );
}
