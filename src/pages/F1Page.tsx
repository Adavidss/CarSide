import { Suspense, lazy, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { appConfig } from '@/config/appConfig';
import { useNow } from '@/hooks/useNow';
import { useConstructorStandings, useDriverStandings, useF1Schedule, useLastResult, useQualifying } from '@/hooks/useF1';
import { teamColor } from '@/services/f1/teamColors';
import { useSettings } from '@/hooks/useSettings';
import { findLastCompletedRace, findNextRace, getWeekendStatus } from '@/services/f1';
import { getCircuitMeta } from '@/services/f1/circuitMeta';
import { LIVE_MARGIN_MS } from '@/services/f1/openf1';
import { TitleRace } from '@/components/f1/TitleRace';
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

const RaceReplay = lazy(() => import('@/components/f1/RaceReplay').then((m) => ({ default: m.RaceReplay })));
const LiveTiming = lazy(() => import('@/components/f1/LiveTiming').then((m) => ({ default: m.LiveTiming })));

export function F1Page() {
  const now = useNow(1000);
  const { settings, revealRound, isRoundRevealed, revealKey, isKeyRevealed } = useSettings();
  const schedule = useF1Schedule();
  const drivers = useDriverStandings();
  const constructors = useConstructorStandings();
  const lastResult = useLastResult();

  const races = schedule.data ?? [];
  const nextRace = findNextRace(races, now);
  const lastRace = findLastCompletedRace(races, now);
  const status = nextRace ? getWeekendStatus(nextRace, now) : 'complete';

  // OpenF1 counts a session as live from 30 min before it starts to 30 min after it ends.
  const liveRace = useMemo(
    () =>
      races.find((r) => r.sessions.some((s) => now.getTime() >= new Date(s.start).getTime() - LIVE_MARGIN_MS && now.getTime() <= new Date(s.end).getTime() + LIVE_MARGIN_MS)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [races, Math.floor(now.getTime() / 60_000)],
  );
  const [params] = useSearchParams();
  // ?livesim=<openf1 session key>[&speed=N] replays a finished session through the live screen (free tier).
  const simKey = Number(params.get('livesim'));
  const simulate = useMemo(
    () => (Number.isFinite(simKey) && simKey > 0 ? { sessionKey: simKey, speed: Number(params.get('speed')) || 1 } : undefined),
    [simKey, params],
  );
  const liveLaps = liveRace ? getCircuitMeta(liveRace.circuitId, liveRace.country).laps : undefined;

  // Starting grid: between the end of qualifying and lights out.
  const qualiSession = nextRace?.sessions.find((s) => s.key === 'qualifying');
  const gridWindow = !!nextRace && !!qualiSession && now.getTime() > new Date(qualiSession.end).getTime() && now.getTime() < new Date(nextRace.raceStart).getTime();
  const qualifying = useQualifying(gridWindow ? nextRace.season : undefined, gridWindow ? nextRace.round : undefined);
  const gridKey = nextRace ? `${nextRace.season}:${nextRace.round}:grid` : '';
  const gridHidden = settings.avoidSpoilers && !isKeyRevealed(gridKey);

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

      {(liveRace || simulate) && (
        <Suspense fallback={<Skeleton variant="row" count={3} label="Loading live timing" />}>
          <LiveTiming auth={settings.openf1} enabled simulate={simulate} totalLaps={liveLaps ?? nextRace?.round ? liveLaps : undefined} favoriteCode={settings.favoriteDriver?.code} now={now} />
        </Suspense>
      )}

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

          {gridWindow && (
            <section className="section">
              <SectionHeading title="Starting grid" meta="From qualifying" />
              {gridHidden ? (
                <div className="spoiler">
                  <div>
                    <div className="spoiler__title">Qualifying complete</div>
                    <div className="meta">The grid is hidden — spoiler mode is on.</div>
                  </div>
                  <button type="button" className="btn btn--accent btn--sm" onClick={() => revealKey(gridKey)}>
                    <IconEye />
                    Reveal grid
                  </button>
                </div>
              ) : qualifying.status === 'loading' ? (
                <Skeleton variant="row" count={4} label="Loading grid" />
              ) : qualifying.data ? (
                <ol className="grid-list" aria-label="Starting grid">
                  {qualifying.data.map((q) => (
                    <li key={q.driverId} className={`srow${q.position <= 3 ? ' srow--top' : ''}${q.driverId === settings.favoriteDriver?.id ? ' srow--fav' : ''}`}>
                      <span className="srow__pos num">{q.position}</span>
                      <span className="srow__name">
                        <span className="srow__bar" style={{ ['--team' as string]: teamColor(q.constructorId) }} aria-hidden="true" />
                        <span className="srow__code">{q.code}</span>
                        <span style={{ minWidth: 0 }}>
                          <span className="srow__driver" style={{ display: 'block' }}>
                            <Link to={`/f1/driver/${q.driverId}`} className="srow__link">
                              {q.givenName} {q.familyName}
                            </Link>
                          </span>
                          <span className="srow__team" style={{ display: 'block' }}>
                            {q.constructorName}
                          </span>
                        </span>
                      </span>
                      <span className="srow__pts num">{q.q3 ?? q.q2 ?? q.q1 ?? '–'}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="meta">The grid appears here once qualifying results are published.</p>
              )}
            </section>
          )}
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
          {result && !resultsHidden && lastRace && (
            <Suspense fallback={<Skeleton variant="row" count={2} label="Loading race replay" />}>
              <RaceReplay race={lastRace} favoriteCode={settings.favoriteDriver?.code} />
            </Suspense>
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
                <DriverStandingsTable standings={drivers.data} favoriteId={settings.favoriteDriver?.id} />
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

      {drivers.data && !standingsHidden && races.length > 0 && (
        <section className="section">
          <SectionHeading title="Title race" meta="Championship maths" />
          <TitleRace drivers={drivers.data} constructors={constructors.data} races={races} now={now} favoriteId={settings.favoriteDriver?.id} />
        </section>
      )}

      {races.length > 0 && (
        <section className="section">
          <SectionHeading title={`${races[0].season} season`} meta={`${races.length} rounds`} />
          <SeasonList races={races} currentRound={nextRace?.round} now={now} />
        </section>
      )}

      <p className="meta" style={{ marginTop: 32 }}>
        {appConfig.f1.disclaimer} Schedule, standings and results from the Jolpica F1 API; race replays from the OpenF1 API. {circuitAttribution}
      </p>
    </div>
  );
}
