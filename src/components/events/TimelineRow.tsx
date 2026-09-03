import { Link } from 'react-router-dom';
import type { TimelineItem } from '@/utils/timeline';
import type { EventWeather } from '@/hooks/useWeather';
import { formatMonthDay, formatTime, isSameDay } from '@/utils/dates';
import { formatMiles } from '@/utils/distance';
import { eventTypeLabel, settingLabel } from '@/utils/eventTypes';
import { getWatchability } from '@/utils/watchability';
import { downloadSessionIcs } from '@/utils/calendar';
import { isLive } from '@/utils/timeline';
import { IconCalendar } from '@/components/icons/Icons';
import { StatusPill } from '@/components/ui/StatusPill';
import { WeatherBadge } from './WeatherBadge';
import { SaveButton } from './SaveButton';

interface TimelineRowProps {
  item: TimelineItem;
  now: Date;
  weather?: EventWeather | null;
  /** Compact variant hides the aside actions (used in narrow lists). */
  compact?: boolean;
  /** Extra action rendered in the aside (e.g. a Remove button on the Saved page). */
  extraAction?: React.ReactNode;
}

function TimeCell({ item }: { item: TimelineItem }) {
  if (item.dateOnly) {
    const multiDay = item.end && !isSameDay(item.start, item.end);
    if (multiDay) {
      return (
        <div className="trow__time">
          {formatMonthDay(item.start)}
          <small>to {formatMonthDay(item.end!)}</small>
        </div>
      );
    }
    return <div className="trow__time">{item.kind === 'event' && item.event.timeTbd ? 'TBA' : 'All day'}</div>;
  }
  const [time, period] = formatTime(item.start).split(' ');
  return (
    <div className="trow__time">
      {time}
      <small>
        {period}
        {item.end && item.kind === 'event' && ` – ${formatTime(item.end)}`}
      </small>
    </div>
  );
}

export function TimelineRow({ item, now, weather, compact = false, extraAction }: TimelineRowProps) {
  const live = isLive(item, now);
  const past = !live && (item.end ?? item.start).getTime() < now.getTime() && !(item.dateOnly && isSameDay(item.start, now));

  if (item.kind === 'f1') {
    const { race, session } = item;
    const minor = session.key === 'fp1' || session.key === 'fp2' || session.key === 'fp3';
    const watch = getWatchability(item.start);
    return (
      <li className={`trow trow--f1${minor ? ' trow--minor' : ''}${past ? ' trow--past' : ''}`}>
        <TimeCell item={item} />
        <div className="trow__body">
          <div className="trow__title">
            <span className="tag tag--accent">F1</span>
            <Link to="/f1">{session.label}</Link>
            {live && <span className="tag tag--live">Live</span>}
          </div>
          <div className="trow__meta">
            <span>{race.name}</span>
            <span>{race.locality}</span>
            {session.timeTbc && <span>Time to be confirmed</span>}
          </div>
        </div>
        {!compact && (
          <div className="trow__aside">
            {!past && <StatusPill tone={watch.tone} label={watch.label} title={watch.note} />}
            <div className="trow__actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm btn--icon"
                aria-label={`Add ${race.name} ${session.label} to calendar`}
                title="Add to calendar"
                onClick={() => downloadSessionIcs(race, session)}
              >
                <IconCalendar />
              </button>
            </div>
          </div>
        )}
      </li>
    );
  }

  const { event } = item;
  const detailPath = `/nearby/${encodeURIComponent(event.id)}`;
  return (
    <li className={`trow trow--event${past ? ' trow--past' : ''}`}>
      <TimeCell item={item} />
      <div className="trow__body">
        <div className="trow__title">
          <Link to={detailPath}>{event.title}</Link>
          {item.ongoing && <span className="tag">In progress</span>}
        </div>
        {event.subtitle && <div className="trow__sub">{event.subtitle}</div>}
        <div className="trow__meta">
          <span>{eventTypeLabel(event.type)}</span>
          <span>{event.city}</span>
          {event.distanceMiles !== undefined && <span className="num">{formatMiles(event.distanceMiles)}</span>}
          {event.admission && <span>{event.admission}</span>}
          {settingLabel(event.setting) && <span>{settingLabel(event.setting)}</span>}
          {event.recurring && <span>Recurring · confirm date</span>}
        </div>
      </div>
      {!compact && (
        <div className="trow__aside">
          {!past && <WeatherBadge weather={weather} showVerdict={false} />}
          <div className="trow__actions">
            {extraAction ?? <SaveButton event={event} />}
          </div>
        </div>
      )}
    </li>
  );
}
