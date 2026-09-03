import { Link, useParams } from 'react-router-dom';
import { useNow } from '@/hooks/useNow';
import { useCircuitWinners, useF1Schedule } from '@/hooks/useF1';
import { usePointWeather } from '@/hooks/useWeather';
import { useArticlePhoto, useWikiSummary } from '@/hooks/useWiki';
import { getWeekendStatus } from '@/services/f1';
import { getCircuitMeta } from '@/services/f1/circuitMeta';
import { teamColor } from '@/services/f1/teamColors';
import { wikiTitleFromUrl } from '@/services/wiki';
import { formatDateSpan, formatMonthDay, formatTime, formatWeekday, localTimeZoneName } from '@/utils/dates';
import { CircuitOutline, getCircuitRecord } from '@/components/f1/CircuitOutline';
import { Countdown } from '@/components/f1/Countdown';
import { Flag } from '@/components/f1/Flag';
import { SessionList } from '@/components/f1/SessionList';
import { WeatherBadge } from '@/components/events/WeatherBadge';
import { Photo } from '@/components/media/Photo';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Skeleton } from '@/components/ui/Skeleton';
import { IconArrowLeft, IconExternal } from '@/components/icons/Icons';

const STATUS_LABEL = { upcoming: 'Upcoming', 'in-progress': 'Race weekend under way', complete: 'Complete' } as const;

/** One Grand Prix: the circuit in pictures and numbers, the weekend in your time zone, recent winners. */
export function RoundPage() {
  const { round } = useParams();
  const now = useNow(1000);
  const schedule = useF1Schedule();
  const race = schedule.data?.find((r) => r.round === Number(round));
  const meta = race ? getCircuitMeta(race.circuitId, race.country) : undefined;
  const circuit = getCircuitRecord(meta?.geo);
  const circuitTitle = wikiTitleFromUrl(race?.circuitUrl);
  const photo = useArticlePhoto(circuitTitle);
  const summary = useWikiSummary(circuitTitle);
  const winners = useCircuitWinners(race?.circuitId);
  const raceStart = race ? new Date(race.raceStart) : undefined;
  const weather = usePointWeather(
    race?.latitude != null && race.longitude != null ? { latitude: race.latitude, longitude: race.longitude } : undefined,
    raceStart,
  );

  if (schedule.status === 'loading') {
    return (
      <div className="page">
        <Skeleton variant="text" width="20%" />
        <div style={{ height: 16 }} />
        <Skeleton variant="title" width="60%" />
        <div style={{ height: 24 }} />
        <Skeleton variant="row" count={3} label="Loading round" />
      </div>
    );
  }

  if (!race || !raceStart || !meta) {
    return (
      <div className="page">
        <Link to="/f1" className="back-link">
          <IconArrowLeft className="icon--sm" /> F1
        </Link>
        <div className="empty">
          <h1 className="empty__title">Round not found</h1>
          <p className="empty__text">That round isn't on this season's calendar.</p>
          <Link to="/f1" className="btn btn--sm">
            Back to F1
          </Link>
        </div>
      </div>
    );
  }

  const status = getWeekendStatus(race, now);
  const first = new Date(race.sessions[0]?.start ?? race.raceStart);
  const nextSession = race.sessions.find((s) => new Date(s.end).getTime() > now.getTime());
  const lengthKm = circuit ? (circuit.lengthM / 1000).toFixed(3) : undefined;

  return (
    <div className="page">
      <Link to="/f1" className="back-link">
        <IconArrowLeft className="icon--sm" /> F1
      </Link>

      <header className="page__header">
        <div>
          <div className="gp__head">
            <Flag country={meta.country} size="lg" title={race.country} />
            <span className="label label--strong">
              Round {race.round} of {schedule.data?.length ?? '–'}
            </span>
            <span className="label label--accent">{STATUS_LABEL[status]}</span>
          </div>
          <h1 className="page__title">{race.name}</h1>
        </div>
        <p className="page__context">
          <span>{race.circuitName}</span>
          <span aria-hidden="true">·</span>
          <span>
            {race.locality}, {race.country}
          </span>
          <span aria-hidden="true">·</span>
          <span className="num">{formatDateSpan(first, raceStart)}</span>
        </p>
      </header>

      <Photo photo={photo.data} loading={photo.status === 'loading'} />

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
              {lengthKm && <small>· {(meta.laps * Number(lengthKm)).toFixed(0)} km</small>}
            </dd>
          </div>
        )}
        {circuit?.opened && (
          <div className="fact">
            <dt className="label">Opened</dt>
            <dd className="fact__value">
              {circuit.opened}
              {circuit.firstGp && <small>· first GP {circuit.firstGp}</small>}
            </dd>
          </div>
        )}
        <div className="fact">
          <dt className="label">Race-day forecast</dt>
          <dd className="fact__value">{weather ? <WeatherBadge weather={weather} showVerdict={false} /> : <small style={{ marginLeft: 0 }}>Not yet available</small>}</dd>
        </div>
        {race.sprintWeekend && (
          <div className="fact">
            <dt className="label">Format</dt>
            <dd className="fact__value">Sprint weekend</dd>
          </div>
        )}
      </dl>

      {status !== 'complete' && nextSession && (
        <div className="gp__countdown">
          <span className="label label--accent">{nextSession.label} starts in</span>
          <Countdown target={new Date(nextSession.start)} now={now} size="md" />
        </div>
      )}

      <section className="section">
        <SectionHeading title="Weekend schedule" meta={`${localTimeZoneName(now)} · local time`} />
        <SessionList race={race} now={now} />
      </section>

      <section className="section">
        <SectionHeading title="The circuit" meta={circuit?.name ?? race.circuitName} />
        <div className="circuit-grid">
          {circuit && (
            <figure className="gp__outline">
              <CircuitOutline geoId={meta.geo} />
              <figcaption className="gp__outline-caption">
                <span className="label label--strong">{circuit.name}</span>
                <span className="label">{lengthKm} km</span>
              </figcaption>
            </figure>
          )}
          <div className="prose">
            {summary.status === 'loading' ? (
              <Skeleton variant="text" count={3} label="Loading circuit notes" />
            ) : summary.data?.extract ? (
              <>
                <p>{summary.data.extract}</p>
                <p>
                  <a className="link" href={summary.data.url} target="_blank" rel="noreferrer">
                    Read more on Wikipedia <IconExternal className="icon--sm" style={{ display: 'inline', verticalAlign: '-3px' }} />
                  </a>
                </p>
              </>
            ) : (
              <p className="meta">No circuit notes available.</p>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHeading title="Recent winners" meta={`at ${race.locality}`} />
        {winners.status === 'loading' ? (
          <Skeleton variant="row" count={3} label="Loading winners" />
        ) : winners.data?.length ? (
          <ol className="winners">
            {winners.data.map((w) => (
              <li key={w.season} className="winner">
                <span className="winner__season num">{w.season}</span>
                <span className="lrow__bar" style={{ background: teamColor(w.constructorId) ?? 'var(--fg-3)' }} aria-hidden="true" />
                <span className="winner__name">
                  <Link to={`/f1/driver/${w.driverId}`}>{w.familyName}</Link>
                  <span className="meta">{w.constructorName}</span>
                </span>
                <span className="winner__time num">{w.time ?? ''}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="meta">No previous Grands Prix recorded at this circuit.</p>
        )}
      </section>
    </div>
  );
}
