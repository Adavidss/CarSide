import { Link } from 'react-router-dom';
import type { F1Race, F1WeekendStatus } from '@/models/f1';
import { findCurrentSession, isSessionLive } from '@/services/f1';
import { getCircuitMeta } from '@/services/f1/circuitMeta';
import { usePointWeather } from '@/hooks/useWeather';
import { formatMonthDay, formatTime, formatWeekday, localTimeZoneName } from '@/utils/dates';
import { CircuitOutline, getCircuitRecord } from './CircuitOutline';
import { Countdown } from './Countdown';
import { SessionProgress } from './SessionProgress';
import { WatchButton } from './WatchButton';
import { HOUR_MS } from '@/utils/dates';
import { Flag } from './Flag';
import { WeatherBadge } from '@/components/events/WeatherBadge';

interface NextGrandPrixProps {
  race: F1Race;
  now: Date;
  status: F1WeekendStatus;
  totalRounds: number;
}

const STATUS_LABEL: Record<F1WeekendStatus, string> = {
  upcoming: 'Next Grand Prix',
  'in-progress': 'Race weekend under way',
  complete: 'Last Grand Prix',
};

export function NextGrandPrix({ race, now, status, totalRounds }: NextGrandPrixProps) {
  const meta = getCircuitMeta(race.circuitId, race.country);
  const circuit = getCircuitRecord(meta.geo);
  const raceStart = new Date(race.raceStart);
  const current = findCurrentSession(race, now);
  const live = current ? isSessionLive(current, now) : false;
  const imminent = !!current && !live && new Date(current.start).getTime() - now.getTime() < 2 * HOUR_MS;
  const raceWeather = usePointWeather(
    race.latitude != null && race.longitude != null ? { latitude: race.latitude, longitude: race.longitude } : undefined,
    raceStart,
  );
  const lengthKm = circuit ? (circuit.lengthM / 1000).toFixed(3) : undefined;

  return (
    <div className="gp">
      <div>
        <div className="gp__head">
          <Flag country={meta.country} size="lg" title={race.country} />
          <span className="label label--strong">
            Round {race.round} of {totalRounds}
          </span>
          <span className="label label--accent">{STATUS_LABEL[status]}</span>
        </div>
        <h2 className="gp__name">
          <Link to={`/f1/round/${race.round}`} className="gp__link">
            {race.name}
          </Link>
        </h2>
        <p className="gp__circuit">
          {race.circuitName} · {race.locality}, {race.country}
        </p>

        <dl className="gp__facts">
          <div className="fact">
            <dt className="label">Race</dt>
            <dd className="fact__value">
              {formatWeekday(raceStart, 'short')} {formatMonthDay(raceStart)}
              <small>
                {formatTime(raceStart)} {localTimeZoneName(raceStart)}
              </small>
            </dd>
          </div>
          {lengthKm && (
            <div className="fact">
              <dt className="label">Length</dt>
              <dd className="fact__value">
                {lengthKm}
                <small>km</small>
              </dd>
            </div>
          )}
          {meta.laps && (
            <div className="fact">
              <dt className="label">Distance</dt>
              <dd className="fact__value">
                {meta.laps}
                <small>laps</small>
              </dd>
            </div>
          )}
          <div className="fact">
            <dt className="label">Race-day forecast</dt>
            <dd className="fact__value">
              {raceWeather ? <WeatherBadge weather={raceWeather} showVerdict={false} /> : <small style={{ marginLeft: 0 }}>Not yet available</small>}
            </dd>
          </div>
        </dl>

        {status !== 'complete' && current && (
          <div className="gp__countdown">
            <span className="label label--accent">
              {live ? `${current.label} — live now` : `${current.label} starts in`}
            </span>
            {live ? (
              <>
                <span className="nextup__big">Ends ~{formatTime(new Date(current.end))}</span>
                <SessionProgress start={new Date(current.start)} end={new Date(current.end)} now={now} />
              </>
            ) : (
              <Countdown target={new Date(current.start)} now={now} size="md" />
            )}
            {(live || imminent) && (
              <div className="btn-row" style={{ marginTop: 8 }}>
                <WatchButton live={live} />
              </div>
            )}
          </div>
        )}
      </div>

      {circuit && (
        <figure className="gp__outline">
          <CircuitOutline geoId={meta.geo} />
          <figcaption className="gp__outline-caption">
            <span className="label label--strong">{circuit.name}</span>
            <span className="label">
              {lengthKm} km{race.sprintWeekend ? ' · Sprint weekend' : ''}
            </span>
          </figcaption>
        </figure>
      )}
    </div>
  );
}
