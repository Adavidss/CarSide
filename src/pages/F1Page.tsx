import { Link } from 'react-router-dom';
import { appConfig } from '@/config/appConfig';
import { useNow } from '@/hooks/useNow';
import { useConstructorStandings, useDriverStandings, useF1Schedule, useLastResult } from '@/hooks/useF1';
import { useSettings } from '@/hooks/useSettings';
import { findLastCompletedRace, findNextRace, getWeekendStatus } from '@/services/f1';
import { localTimeZoneName } from '@/utils/dates';
import { NextGrandPrix } from '@/components/f1/NextGrandPrix';
import { SessionList } from '@/components/f1/SessionList';
import { LastRace } from '@/components/f1/LastRace';
import { ConstructorStandingsTable, DriverStandingsTable } from '@/components/f1/StandingsTable';
import { SeasonList } from '@/components/f1/SeasonList';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Skeleton } from '@/components/ui/Skeleton';
import { Freshness } from '@/components/ui/Freshness';
import { IconEye } from '@/components/icons/Icons';
import { circuitAttribution } from '@/services/f1/attribution';

export function F1Page() {
  const now = useNow(1000);
  const { settings, revealRound, isRoundRevealed } = useSettings();
  const schedule = useF1Schedule();
  const drivers = useDriverStandings();
  const constructors = useConstructorStandings();
  const lastResult = useLastResult();

  const races = schedule.data ?? [];
  const nextRace = findNextRace(races, now);
  const lastRace = findLastCompletedRace(races, now);
  const status = nextRace ? getWeekendStatus(nextRace, now) : 'complete';

  const result = lastResult.data ?? null;
  const resultsHidden = settings.avoidSpoilers && !!result && !isRoundRevealed(result.season, result.round);
  const standingsRound = drivers.data?.round ?? constructors.data?.round;
  const standingsSeason = drivers.data?.season ?? constructors.data?.season;
  const standingsHidden =
    settings.avoidSpoilers && standingsRound !== undefined && standingsSeason !== undefined && !isRoundRevealed(standingsSeason, standingsRound);

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <p className="label label--lg">Formula 1</p>
          <h1 className="page__title">{nextRace ? (status === 'in-progress' ? 'Race weekend' : 'Next race weekend') : 'Season'}</h1>
        </div>
        <p className="page__context">
          <span>Times in {localTimeZoneName(now)}</span>
          <span aria-hidden="true">·</span>
          <span>Spoilers {settings.avoidSpoilers ? 'hidden' : 'shown'}</span>
          <span aria-hidden="true">·</span>
          <Link to="/settings" className="btn btn--link">
            Change
          </Link>
        </p>
      </header>

      {schedule.status === 'loading' ? (
        <div className="gp">
          <div>
            <Skeleton variant="text" width="30%" />
            <div style={{ height: 12 }} />
            <Skeleton variant="title" width="60%" />
            <div style={{ height: 24 }} />
            <Skeleton variant="row" count={2} />
          </div>
        </div>
      ) : schedule.status === 'error' || !schedule.data ? (
        <p className="notice notice--error">The F1 schedule could not be loaded ({schedule.error}). Check your connection and try again.</p>
      ) : nextRace ? (
        <>
          <NextGrandPrix race={nextRace} now={now} status={status} totalRounds={races.length} />
          <div className="section__foot">
            <Freshness updatedAt={schedule.updatedAt} stale={schedule.stale} source={schedule.source} onReload={schedule.reload} now={now} />
          </div>

          <section className="section">
            <SectionHeading title="Weekend schedule" meta={`${localTimeZoneName(now)} · local time`} />
            <SessionList race={nextRace} now={now} />
          </section>
        </>
      ) : (
        <p className="notice">The {races[0]?.season ?? ''} season is complete. Check back when the new calendar is published.</p>
      )}

      {(result || lastResult.status === 'loading') && (
        <section className="section">
          <SectionHeading title="Last race" meta={lastRace ? `Round ${lastRace.round}` : undefined} />
          {result ? (
            <LastRace result={result} race={lastRace} hidden={resultsHidden} onReveal={() => revealRound(result.season, result.round)} />
          ) : (
            <Skeleton variant="row" count={3} label="Loading results" />
          )}
        </section>
      )}

      <section className="section">
        <SectionHeading
          title="Championship standings"
          meta={standingsRound !== undefined ? `After round ${standingsRound}` : undefined}
        />
        {standingsHidden ? (
          <div className="spoiler">
            <div>
              <div className="spoiler__title">Standings hidden</div>
              <div className="meta">They include the last race result. Reveal when you've watched it.</div>
            </div>
            <button
              type="button"
              className="btn btn--accent btn--sm"
              onClick={() => standingsSeason && standingsRound !== undefined && revealRound(standingsSeason, standingsRound)}
            >
              <IconEye />
              Show standings
            </button>
          </div>
        ) : (
          <div className="standings-grid">
            <div>
              <p className="label" style={{ marginBottom: 6 }}>
                Drivers
              </p>
              {drivers.data ? (
                <DriverStandingsTable standings={drivers.data} />
              ) : drivers.status === 'error' ? (
                <p className="meta">Driver standings unavailable ({drivers.error}).</p>
              ) : (
                <Skeleton variant="row" count={6} label="Loading standings" />
              )}
            </div>
            <div>
              <p className="label" style={{ marginBottom: 6 }}>
                Constructors
              </p>
              {constructors.data ? (
                <ConstructorStandingsTable standings={constructors.data} />
              ) : constructors.status === 'error' ? (
                <p className="meta">Constructor standings unavailable ({constructors.error}).</p>
              ) : (
                <Skeleton variant="row" count={6} label="Loading standings" />
              )}
            </div>
          </div>
        )}
        {drivers.data && !standingsHidden && (
          <div className="section__foot">
            <Freshness updatedAt={drivers.updatedAt} stale={drivers.stale} source={drivers.source} onReload={drivers.reload} now={now} />
          </div>
        )}
      </section>

      {races.length > 0 && (
        <section className="section">
          <SectionHeading title={`${races[0].season} season`} meta={`${races.length} rounds`} />
          <SeasonList races={races} currentRound={nextRace?.round} now={now} />
        </section>
      )}

      <p className="meta" style={{ marginTop: 32 }}>
        {appConfig.f1.disclaimer} Schedule, standings and results from the Jolpica F1 API. {circuitAttribution}
      </p>
    </div>
  );
}
