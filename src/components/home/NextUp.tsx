import { Link } from 'react-router-dom';
import type { TimelineItem } from '@/utils/timeline';
import type { EventWeather } from '@/hooks/useWeather';
import { isLive } from '@/utils/timeline';
import { formatDateSpan, formatMonthDay, formatTime, formatWeekday, isSameDay, localTimeZoneName } from '@/utils/dates';
import { formatMiles } from '@/utils/distance';
import { eventTypeLabel } from '@/utils/eventTypes';
import { getWatchability } from '@/utils/watchability';
import { downloadSessionIcs } from '@/utils/calendar';
import { Countdown } from '@/components/f1/Countdown';
import { Flag } from '@/components/f1/Flag';
import { StatusPill } from '@/components/ui/StatusPill';
import { IconCalendar, IconDirections } from '@/components/icons/Icons';
import { getCircuitMeta } from '@/services/f1/circuitMeta';
import { WeatherBadge } from '@/components/events/WeatherBadge';
import { SaveButton } from '@/components/events/SaveButton';
import { directionsHref } from '@/components/events/EventActions';

interface NextUpProps {
  item: TimelineItem;
  now: Date;
  weather?: EventWeather | null;
}

/**
 * The single most relevant upcoming thing, given hero treatment through
 * typography and a countdown — not a card.
 */
export function NextUp({ item, now, weather }: NextUpProps) {
  const live = isLive(item, now);
  const dayLabel = isSameDay(item.start, now) ? 'Today' : formatWeekday(item.start);

  if (item.kind === 'f1') {
    const { race, session } = item;
    const watch = getWatchability(item.start);
    const meta = getCircuitMeta(race.circuitId, race.country);
    return (
      <section className="nextup" aria-labelledby="nextup-title">
        <div>
          <div className="nextup__label">
            {live ? <span className="live-dot" aria-hidden="true" /> : null}
            <span className="label label--accent">{live ? 'Live now' : 'Next up'}</span>
            <span className="tag">F1</span>
          </div>
          <h2 id="nextup-title" className="nextup__title" style={{ marginTop: 10 }}>
            {race.name}
          </h2>
          <p className="nextup__meta" style={{ marginTop: 10 }}>
            <strong>{session.label}</strong>
            <span aria-hidden="true">·</span>
            <span>{dayLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="num">
              {formatTime(item.start)} {localTimeZoneName(item.start)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="row" style={{ gap: 6 }}>
              <Flag country={meta.country} title={race.country} />
              {race.locality}
            </span>
          </p>
          <div className="nextup__actions">
            <Link to="/f1" className="btn btn--sm">
              F1 weekend
            </Link>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => downloadSessionIcs(race, session)}>
              <IconCalendar />
              Add to calendar
            </button>
          </div>
        </div>
        <div className="nextup__aside">
          {live ? (
            <>
              <span className="label">Session under way</span>
              <span className="nextup__big">Ends ~{formatTime(item.end)}</span>
            </>
          ) : (
            <>
              <span className="label">Starts in</span>
              <Countdown target={item.start} now={now} size="lg" />
            </>
          )}
          <StatusPill tone={watch.tone} label={watch.label} title={watch.note} />
        </div>
      </section>
    );
  }

  const { event } = item;
  const detailPath = `/nearby/${encodeURIComponent(event.id)}`;
  const directions = directionsHref(event);
  const multiDay = item.end && !isSameDay(item.start, item.end);

  return (
    <section className="nextup" aria-labelledby="nextup-title">
      <div>
        <div className="nextup__label">
          {live ? <span className="live-dot" aria-hidden="true" /> : null}
          <span className="label label--accent">{live ? 'Happening now' : 'Next up'}</span>
          <span className="tag">{eventTypeLabel(event.type)}</span>
        </div>
        <h2 id="nextup-title" className="nextup__title" style={{ marginTop: 10 }}>
          <Link to={detailPath}>{event.title}</Link>
        </h2>
        {event.subtitle && <p className="trow__sub" style={{ marginTop: 6 }}>{event.subtitle}</p>}
        <p className="nextup__meta" style={{ marginTop: 10 }}>
          <strong>{multiDay ? formatDateSpan(item.start, item.end!) : dayLabel}</strong>
          {!item.dateOnly && (
            <>
              <span aria-hidden="true">·</span>
              <span className="num">{formatTime(item.start)}</span>
            </>
          )}
          {item.dateOnly && event.timeTbd && (
            <>
              <span aria-hidden="true">·</span>
              <span>Time TBA</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>{event.venue ?? event.city}</span>
          {event.distanceMiles !== undefined && (
            <>
              <span aria-hidden="true">·</span>
              <span className="num">{formatMiles(event.distanceMiles)}</span>
            </>
          )}
        </p>
        <div className="nextup__actions">
          <Link to={detailPath} className="btn btn--sm">
            Details
          </Link>
          {directions && (
            <a className="btn btn--ghost btn--sm" href={directions} target="_blank" rel="noreferrer">
              <IconDirections />
              Directions
            </a>
          )}
          <SaveButton event={event} showLabel />
        </div>
      </div>
      <div className="nextup__aside">
        {live ? (
          <>
            <span className="label">Under way</span>
            {item.end && <span className="nextup__big">Until {formatTime(item.end)}</span>}
          </>
        ) : item.dateOnly ? (
          <>
            <span className="label">{isSameDay(item.start, now) ? 'Today' : formatWeekday(item.start, 'long')}</span>
            <span className="nextup__big">{formatMonthDay(item.start)}</span>
          </>
        ) : (
          <>
            <span className="label">Starts in</span>
            <Countdown target={item.start} now={now} size="lg" />
          </>
        )}
        <WeatherBadge weather={weather} />
      </div>
    </section>
  );
}
