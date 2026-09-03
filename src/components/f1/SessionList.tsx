import type { F1Race } from '@/models/f1';
import { isSessionLive } from '@/services/f1';
import { formatTime, formatWeekday } from '@/utils/dates';
import { getWatchability } from '@/utils/watchability';
import { downloadSessionIcs, downloadWeekendIcs } from '@/utils/calendar';
import { IconCalendar } from '@/components/icons/Icons';
import { StatusPill } from '@/components/ui/StatusPill';

interface SessionListProps {
  race: F1Race;
  now: Date;
}

/** Timing-board style list of the weekend's sessions in the user's local zone. */
export function SessionList({ race, now }: SessionListProps) {
  return (
    <>
      <ul className="sessions">
        {race.sessions.map((session) => {
          const start = new Date(session.start);
          const end = new Date(session.end);
          const live = isSessionLive(session, now);
          const done = !live && end.getTime() < now.getTime();
          const watch = getWatchability(start);
          return (
            <li key={session.key} className={`session${live ? ' session--live' : ''}${done ? ' session--done' : ''}`}>
              <span className="session__label">{session.shortLabel}</span>
              <span className="session__name">{session.label}</span>
              <span className="session__when num">
                <small>{formatWeekday(start, 'short')}</small>
                {session.timeTbc ? 'Time TBC' : formatTime(start)}
                {live && (
                  <span className="tag tag--live" style={{ marginLeft: 8 }}>
                    Live
                  </span>
                )}
              </span>
              <span className="session__watch">
                {done ? <span className="meta">Complete</span> : <StatusPill tone={watch.tone} label={watch.label} shortLabel={watch.shortLabel} title={watch.note} />}
              </span>
              <span className="session__action">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm btn--icon"
                  aria-label={`Add ${session.label} to calendar`}
                  title="Add to calendar"
                  onClick={() => downloadSessionIcs(race, session)}
                >
                  <IconCalendar />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="section__foot">
        <button type="button" className="btn btn--sm" onClick={() => downloadWeekendIcs(race)}>
          <IconCalendar />
          Add full weekend
        </button>
        <span>Downloads an .ics file with every session — works with Apple, Google and Outlook calendars.</span>
      </div>
    </>
  );
}
