import { Link, useParams } from 'react-router-dom';
import { useNow } from '@/hooks/useNow';
import { useDriverSeasonResults, useDriverStandings, useF1Schedule } from '@/hooks/useF1';
import { useLeadPhoto, useWikiSummary } from '@/hooks/useWiki';
import { useSettings } from '@/hooks/useSettings';
import { findLastCompletedRace } from '@/services/f1';
import { teamColor } from '@/services/f1/teamColors';
import { wikiTitleFromUrl } from '@/services/wiki';
import { Photo } from '@/components/media/Photo';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Skeleton } from '@/components/ui/Skeleton';
import { IconArrowLeft, IconExternal, IconEye } from '@/components/icons/Icons';

function resultTone(position: number, status: string): string {
  if (status !== 'Finished' && !/^\+\d+ Laps?$/.test(status)) return 'out';
  if (position === 1) return 'win';
  if (position <= 3) return 'podium';
  if (position <= 10) return 'points';
  return 'none';
}

/** A driver's season at a glance: portrait, standing, every result, and who they are. */
export function DriverPage() {
  const { id } = useParams();
  const now = useNow(60_000);
  const { settings, setFavoriteDriver, revealRound, isRoundRevealed } = useSettings();
  const standings = useDriverStandings();
  const schedule = useF1Schedule();
  const driver = standings.data?.entries.find((d) => d.driverId === id);
  const results = useDriverSeasonResults(driver?.driverId);
  const title = wikiTitleFromUrl(driver?.url);
  const photo = useLeadPhoto(title);
  const summary = useWikiSummary(title);

  if (standings.status === 'loading') {
    return (
      <div className="page">
        <Skeleton variant="text" width="20%" />
        <div style={{ height: 16 }} />
        <Skeleton variant="title" width="50%" />
        <div style={{ height: 24 }} />
        <Skeleton variant="row" count={3} label="Loading driver" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="page">
        <Link to="/f1" className="back-link">
          <IconArrowLeft className="icon--sm" /> F1
        </Link>
        <div className="empty">
          <h1 className="empty__title">Driver not found</h1>
          <p className="empty__text">They aren't in this season's standings.</p>
          <Link to="/f1" className="btn btn--sm">
            Back to F1
          </Link>
        </div>
      </div>
    );
  }

  const isFavorite = settings.favoriteDriver?.id === driver.driverId;
  const colour = teamColor(driver.constructorId) ?? 'var(--fg-3)';
  const lastRace = schedule.data ? findLastCompletedRace(schedule.data, now) : undefined;
  const hideLast = settings.avoidSpoilers && !!lastRace && !isRoundRevealed(driver ? standings.data!.season : '', lastRace.round);
  const rows = results.data ?? [];
  const podiums = rows.filter((r) => r.position <= 3 && r.status === 'Finished').length;
  const finished = rows.filter((r) => r.status === 'Finished' || /Laps?$/.test(r.status));
  const avgFinish = finished.length ? (finished.reduce((s, r) => s + r.position, 0) / finished.length).toFixed(1) : null;

  return (
    <div className="page">
      <Link to="/f1" className="back-link">
        <IconArrowLeft className="icon--sm" /> F1
      </Link>

      <header className="page__header">
        <div>
          <div className="gp__head">
            <span className="driver__number num" style={{ borderColor: colour }}>
              {driver.number ?? driver.code}
            </span>
            <span className="label label--strong">{driver.code}</span>
            {driver.nationality && <span className="label">{driver.nationality}</span>}
            {isFavorite && <span className="tag tag--accent">Your driver</span>}
          </div>
          <h1 className="page__title">
            {driver.givenName} {driver.familyName}
          </h1>
        </div>
        <p className="page__context">
          <span className="lrow__bar" style={{ background: colour, height: 14 }} aria-hidden="true" />
          <span>{driver.constructorName}</span>
          <span aria-hidden="true">·</span>
          <span className="num">P{driver.position}</span>
          <span aria-hidden="true">·</span>
          <span className="num">{driver.points} pts</span>
        </p>
      </header>

      <div className="driver-grid">
        <Photo photo={photo.data} loading={photo.status === 'loading'} ratio="3 / 4" className="photo--portrait" caption={`${driver.givenName} ${driver.familyName}`} sizes="(min-width: 720px) 320px, 100vw" />
        <div>
          <dl className="gp__facts gp__facts--tight">
            <div className="fact">
              <dt className="label">Championship</dt>
              <dd className="fact__value">
                P{driver.position}
                <small>{driver.points} pts</small>
              </dd>
            </div>
            <div className="fact">
              <dt className="label">Wins</dt>
              <dd className="fact__value">{driver.wins}</dd>
            </div>
            <div className="fact">
              <dt className="label">Podiums</dt>
              <dd className="fact__value">{results.data ? podiums : '–'}</dd>
            </div>
            <div className="fact">
              <dt className="label">Avg finish</dt>
              <dd className="fact__value">{avgFinish ?? '–'}</dd>
            </div>
          </dl>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button type="button" className={`btn btn--sm${isFavorite ? ' is-active' : ''}`} onClick={() => setFavoriteDriver(isFavorite ? null : { id: driver.driverId, code: driver.code, name: `${driver.givenName} ${driver.familyName}` })}>
              {isFavorite ? 'Your driver ✓' : 'Make this your driver'}
            </button>
            {summary.data?.url && (
              <a className="btn btn--ghost btn--sm" href={summary.data.url} target="_blank" rel="noreferrer">
                <IconExternal />
                Wikipedia
              </a>
            )}
          </div>
        </div>
      </div>

      <section className="section">
        <SectionHeading title="Season form" meta={results.data ? `${rows.length} rounds` : undefined} />
        {results.status === 'loading' ? (
          <Skeleton variant="row" count={1} label="Loading results" />
        ) : rows.length ? (
          <>
            <ol className="form" aria-label="Results by round">
              {rows.map((r) => {
                const hidden = hideLast && lastRace && r.round === lastRace.round;
                const tone = hidden ? 'hidden' : resultTone(r.position, r.status);
                return (
                  <li key={r.round} className={`form__cell form__cell--${tone}`} title={hidden ? 'Hidden — spoiler mode' : `${r.raceName}: P${r.position}${r.status !== 'Finished' ? ` (${r.status})` : ''}`}>
                    <span className="form__round num">{r.round}</span>
                    <span className="form__pos num">{hidden ? '?' : tone === 'out' ? 'DNF' : `P${r.position}`}</span>
                  </li>
                );
              })}
            </ol>
            {hideLast && lastRace && (
              <div className="section__foot">
                <span>The latest result is hidden by spoiler mode.</span>
                <button type="button" className="btn btn--link" onClick={() => revealRound(standings.data!.season, lastRace.round)}>
                  <IconEye className="icon--sm" /> Reveal
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="meta">No results yet this season.</p>
        )}
      </section>

      <section className="section">
        <SectionHeading title="About" />
        <div className="prose">
          {summary.status === 'loading' ? (
            <Skeleton variant="text" count={3} label="Loading biography" />
          ) : summary.data?.extract ? (
            <p>{summary.data.extract}</p>
          ) : (
            <p className="meta">No biography available.</p>
          )}
        </div>
      </section>
    </div>
  );
}
