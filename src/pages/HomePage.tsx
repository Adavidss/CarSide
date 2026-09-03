import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { appConfig } from '@/config/appConfig';
import { useNow } from '@/hooks/useNow';
import { useF1Schedule } from '@/hooks/useF1';
import { useNearbyEvents } from '@/hooks/useEvents';
import { useEventWeather } from '@/hooks/useWeather';
import { useSettings } from '@/hooks/useSettings';
import { useLocationPanel } from '@/hooks/useLocationPanel';
import { findNextRace, isSessionLive } from '@/services/f1';
import { buildTimeline, pickNextUp } from '@/utils/timeline';
import { dayKey, formatDateLong, formatDateSpan, formatTime, formatWeekday, getWeekendWindow, startOfDay } from '@/utils/dates';
import { NextUp } from '@/components/home/NextUp';
import { Timeline } from '@/components/events/Timeline';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Skeleton } from '@/components/ui/Skeleton';
import { Freshness } from '@/components/ui/Freshness';
import { LocationLine } from '@/components/location/LocationLine';
import { Photo } from '@/components/media/Photo';
import { useDailyCar } from '@/hooks/useWiki';

export function HomePage() {
  const now = useNow(1000);
  const todayKey = dayKey(now);
  // Windows only change once a day; don't recompute on every tick.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const window = useMemo(() => getWeekendWindow(now), [todayKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dayStart = useMemo(() => startOfDay(now), [todayKey]);

  const { settings, setRadius } = useSettings();
  const { openPanel } = useLocationPanel();
  const schedule = useF1Schedule();
  const events = useNearbyEvents(dayStart, window.nextWeekendEnd);

  const races = schedule.data;
  const nearby = events.data?.events;
  const weather = useEventWeather(nearby ?? []);

  const pool = useMemo(
    () => buildTimeline({ races: races ?? [], events: nearby ?? [], from: dayStart, to: window.nextWeekendEnd }),
    [races, nearby, dayStart, window.nextWeekendEnd],
  );
  const weekendItems = useMemo(
    () => pool.filter((item) => item.start.getTime() <= window.end.getTime() || item.ongoing),
    [pool, window.end],
  );
  const nextWeekendItems = useMemo(
    () => pool.filter((item) => item.start.getTime() >= window.nextWeekendStart.getTime()),
    [pool, window.nextWeekendStart],
  );
  const nextUp = pickNextUp(pool, now);
  const frame = useDailyCar();
  const nextRace = races ? findNextRace(races, now) : undefined;
  const loading = schedule.status === 'loading' || events.status === 'loading';
  const largerRadius = appConfig.radiusOptions.find((r) => r > settings.radiusMiles);
  const beyond = events.data?.beyondRadius.filter((e) => new Date(e.start).getTime() <= window.end.getTime()).length ?? 0;

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <p className="label label--lg">Your automotive weekend</p>
          <h1 className="page__title">{formatDateLong(now)}</h1>
        </div>
        <LocationLine className="page__context--wide" />
      </header>

      {nextUp ? (
        <NextUp item={nextUp} now={now} weather={nextUp.kind === 'event' ? weather.get(nextUp.id) : undefined} />
      ) : loading ? (
        <section className="nextup" aria-busy="true">
          <div className="nextup__main">
            <Skeleton variant="text" width="30%" />
            <div style={{ height: 12 }} />
            <Skeleton variant="title" width="70%" />
          </div>
        </section>
      ) : (
        <section className="nextup">
          <div className="nextup__main">
            <span className="label label--accent">Next up</span>
            <h2 className="nextup__title">
              A quiet stretch
            </h2>
            <p className="nextup__meta">
              Nothing scheduled within {settings.radiusMiles} mi through {formatDateSpan(window.nextWeekendStart, window.nextWeekendEnd)}.
            </p>
          </div>
        </section>
      )}

      <div className="home-grid">
        <div>
          <section className="section">
            <SectionHeading title={window.label} meta={formatDateSpan(dayStart, window.end)} />
            {loading && weekendItems.length === 0 ? (
              <Skeleton variant="row" count={4} label="Loading the weekend" />
            ) : weekendItems.length > 0 ? (
              <Timeline items={weekendItems} now={now} weather={weather} />
            ) : (
              <div className="empty">
                <h3 className="empty__title">Nothing nearby yet</h3>
                <p className="empty__text">
                  We couldn't find an automotive event within {settings.radiusMiles} miles of {settings.location.label} through{' '}
                  {formatWeekday(window.end)}.
                  {beyond > 0 && ` ${beyond} ${beyond === 1 ? 'event is' : 'events are'} a little further out.`}
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
                  <Link to="/nearby?range=next" className="btn btn--ghost btn--sm">
                    Browse next weekend
                  </Link>
                </div>
              </div>
            )}
            {events.status === 'error' && (
              <p className="notice notice--error" style={{ marginTop: 16 }}>
                Local events could not be loaded: {events.error}
              </p>
            )}
          </section>

          {nextWeekendItems.length > 0 && (
            <section className="section">
              <SectionHeading title="Next weekend" meta={formatDateSpan(window.nextWeekendStart, window.nextWeekendEnd)} />
              <Timeline items={nextWeekendItems} now={now} weather={weather} />
            </section>
          )}

          {(frame.data || frame.status === 'loading') && (
            <section className="section frame">
              <SectionHeading title="The frame" meta="One car worth a look, daily" />
              <Photo photo={frame.data} loading={frame.status === 'loading'} />
            </section>
          )}
        </div>

        <aside className="home-grid__aside">
          <section className="section" style={{ marginTop: 0 }}>
            <SectionHeading title="F1 weekend" meta={nextRace ? `Round ${nextRace.round}` : undefined} />
            {schedule.status === 'loading' ? (
              <Skeleton variant="row" count={3} label="Loading F1 schedule" />
            ) : nextRace ? (
              <>
                <p style={{ margin: '4px 0 10px', fontWeight: 600 }}>
                  <Link to={`/f1/round/${nextRace.round}`}>{nextRace.name}</Link>
                  <span className="meta" style={{ display: 'block', fontWeight: 400 }}>
                    {nextRace.circuitName}
                  </span>
                </p>
                <ul className="mini-list">
                  {nextRace.sessions.map((session) => {
                    const start = new Date(session.start);
                    const live = isSessionLive(session, now);
                    const done = !live && new Date(session.end).getTime() < now.getTime();
                    return (
                      <li key={session.key} className={`mini${live ? ' mini--live' : ''}${done ? ' mini--done' : ''}`}>
                        <span className="mini__label">{session.shortLabel}</span>
                        <span className="mini__when num">
                          {formatWeekday(start, 'short')} {formatTime(start)}
                        </span>
                        {live && <span className="tag tag--live">Live</span>}
                      </li>
                    );
                  })}
                </ul>
                <div className="section__foot">
                  <Link to="/f1" className="btn btn--sm">
                    Full F1 page
                  </Link>
                  <Freshness updatedAt={schedule.updatedAt} stale={schedule.stale} source={schedule.source} now={now} />
                </div>
              </>
            ) : (
              <p className="meta">
                {schedule.status === 'error' ? `F1 schedule unavailable: ${schedule.error}` : 'No upcoming Grand Prix on the calendar.'}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
