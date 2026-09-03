import { Link, useParams } from 'react-router-dom';
import { useEventById } from '@/hooks/useEvents';
import { usePointWeather } from '@/hooks/useWeather';
import { useNow } from '@/hooks/useNow';
import { formatDateLong, formatDateSpan, formatMonthDay, formatTimeRange, formatWeekday, isSameDay, HOUR_MS } from '@/utils/dates';
import { formatMiles } from '@/utils/distance';
import { estimateDriveMinutes, leaveBy } from '@/utils/drive';
import { lightNote, sunTimes } from '@/utils/sun';
import { formatTime } from '@/utils/dates';
import { eventTypeIcon, eventTypeLabel, settingLabel } from '@/utils/eventTypes';
import { openStreetMapUrl } from '@/utils/maps';
import { EventActions } from '@/components/events/EventActions';
import { WeatherBadge } from '@/components/events/WeatherBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { IconArrowLeft, IconExternal } from '@/components/icons/Icons';

export function EventDetailPage() {
  const { id } = useParams();
  const now = useNow(60_000);
  const lookup = useEventById(id ? decodeURIComponent(id) : undefined);
  const event = lookup.event;

  const start = event ? new Date(event.start) : undefined;
  const end = event?.end ? new Date(event.end) : undefined;
  const dateOnly = Boolean(event?.allDay || event?.timeTbd);
  const forecastTime = start ? (dateOnly ? new Date(start.getTime() + 10 * HOUR_MS) : start) : undefined;
  const weather = usePointWeather(
    event?.latitude != null && event.longitude != null ? { latitude: event.latitude, longitude: event.longitude } : undefined,
    forecastTime,
  );

  if (lookup.status === 'loading') {
    return (
      <div className="page">
        <Skeleton variant="text" width="20%" />
        <div style={{ height: 16 }} />
        <Skeleton variant="title" width="60%" />
        <div style={{ height: 24 }} />
        <Skeleton variant="row" count={3} label="Loading event" />
      </div>
    );
  }

  if (!event || !start) {
    return (
      <div className="page">
        <Link to="/nearby" className="back-link">
          <IconArrowLeft className="icon--sm" /> Nearby
        </Link>
        <div className="empty">
          <h1 className="empty__title">Event not found</h1>
          <p className="empty__text">It may have been removed from the list, or the link is out of date.</p>
          <Link to="/nearby" className="btn btn--sm">
            Browse nearby events
          </Link>
        </div>
      </div>
    );
  }

  const Glyph = eventTypeIcon(event.type);
  const multiDay = end && !isSameDay(start, end);
  const past = (end ?? start).getTime() < now.getTime() && !(dateOnly && isSameDay(start, now));
  const driveMinutes = event.distanceMiles !== undefined ? estimateDriveMinutes(event.distanceMiles) : undefined;
  const departure = !past && !dateOnly && event.distanceMiles !== undefined ? leaveBy(start, event.distanceMiles) : undefined;
  const sun = event.latitude != null && event.longitude != null ? sunTimes(start, event.latitude, event.longitude) : null;
  const light = dateOnly ? null : lightNote(start, sun);
  const whenLine = multiDay
    ? `${formatDateSpan(start, end)}${event.timeTbd ? ' · times TBA' : event.allDay ? '' : ` · from ${formatTimeRange(start)}`}`
    : event.timeTbd
      ? `${formatDateLong(start, now)} · time TBA`
      : event.allDay
        ? `${formatDateLong(start, now)} · all day`
        : `${formatDateLong(start, now)} · ${formatTimeRange(start, end)}`;

  return (
    <div className="page">
      <Link to="/nearby" className="back-link">
        <IconArrowLeft className="icon--sm" /> Nearby
      </Link>

      <section className="event-hero" aria-labelledby="event-title">
        <div className="event-hero__bg" aria-hidden="true" />
        <div className="event-hero__inner">
          <div className="event-hero__date" aria-hidden="true">
            <span className="event-hero__day">{start.getDate()}</span>
            <span className="event-hero__month">
              {formatMonthDay(start).split(' ')[0]} · {formatWeekday(start, 'short')}
            </span>
          </div>
          <div>
            <div className="row" style={{ gap: 8 }}>
              <span className="glyph glyph--lg" aria-hidden="true">
                <Glyph />
              </span>
              <span className="tag tag--accent">{eventTypeLabel(event.type)}</span>
              {event.recurring && <span className="tag">Recurring</span>}
              {past && <span className="tag">Past</span>}
            </div>
            <h1 id="event-title" className="event-hero__title" style={{ marginTop: 10 }}>
              {event.title}
            </h1>
            {event.subtitle && <p className="event-hero__sub">{event.subtitle}</p>}
            <div className="event-hero__meta">
              <span className="nextup__meta">
                <strong>{whenLine}</strong>
              </span>
              {weather && !past && <WeatherBadge weather={weather} />}
            </div>
          </div>
        </div>
      </section>

      <EventActions event={event} />

      <dl className="facts">
        <div className="fact">
          <dt className="label">When</dt>
          <dd className="fact__value">
            {whenLine}
            {event.recurrenceText && <span className="meta">Repeats: {event.recurrenceText}</span>}
            {event.confirmWithOrganizer && <span className="meta">Confirm the date with the organizer before heading out.</span>}
          </dd>
        </div>
        <div className="fact">
          <dt className="label">Where</dt>
          <dd className="fact__value">
            {event.venue && <span style={{ display: 'block' }}>{event.venue}</span>}
            <span className="meta">{event.address ?? [event.city, event.region].filter(Boolean).join(', ')}</span>
          </dd>
        </div>
        {event.distanceMiles !== undefined && (
          <div className="fact">
            <dt className="label">Distance</dt>
            <dd className="fact__value">
              <span className="num">
                {formatMiles(event.distanceMiles)}
                {driveMinutes !== undefined && ` · ≈${driveMinutes} min drive`}
              </span>
              <span className="meta">Straight-line distance; drive time is an estimate</span>
            </dd>
          </div>
        )}
        {departure && (
          <div className="fact">
            <dt className="label">Leave by</dt>
            <dd className="fact__value">
              <span className="num">{formatTime(departure)}</span>
              <span className="meta">To arrive ten minutes before {formatTime(start)}</span>
            </dd>
          </div>
        )}
        {sun && (
          <div className="fact">
            <dt className="label">Light</dt>
            <dd className="fact__value">
              <span className="num">
                Sunrise {formatTime(sun.sunrise)} · Sunset {formatTime(sun.sunset)}
              </span>
              {light?.kind === 'morning' && <span className="meta">Golden hour until about {formatTime(light.until)} — bring the camera.</span>}
              {light?.kind === 'evening' && <span className="meta">Golden hour from about {formatTime(light.from)}.</span>}
            </dd>
          </div>
        )}
        {weather && !past && (
          <div className="fact">
            <dt className="label">Forecast</dt>
            <dd className="fact__value">
              <WeatherBadge weather={weather} />
              <span className="meta">
                Around {dateOnly ? 'mid-morning' : formatTimeRange(start)} · {weather.snapshot.precipitationProbability}% chance of rain
              </span>
            </dd>
          </div>
        )}
        {event.admission && (
          <div className="fact">
            <dt className="label">Admission</dt>
            <dd className="fact__value">{event.admission}</dd>
          </div>
        )}
        {settingLabel(event.setting) && (
          <div className="fact">
            <dt className="label">Setting</dt>
            <dd className="fact__value">{settingLabel(event.setting)}</dd>
          </div>
        )}
        <div className="fact">
          <dt className="label">Source</dt>
          <dd className="fact__value">
            {event.source.url ? (
              <a href={event.source.url} className="link" target="_blank" rel="noreferrer">
                {event.source.name}
              </a>
            ) : (
              event.source.name
            )}
            {event.verifiedOn && <span className="meta">Checked {event.verifiedOn}</span>}
          </dd>
        </div>
      </dl>

      {event.description && (
        <div className="prose" style={{ marginTop: 24 }}>
          <p>{event.description}</p>
          {event.notes && <p className="meta">{event.notes}</p>}
        </div>
      )}

      {event.latitude != null && event.longitude != null && (
        <a className="map-link" href={openStreetMapUrl(event.latitude, event.longitude)} target="_blank" rel="noreferrer">
          <span className="row row--between">
            <span>
              View on map · {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
            </span>
            <IconExternal className="icon--sm" />
          </span>
        </a>
      )}
    </div>
  );
}
