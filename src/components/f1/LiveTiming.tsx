import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { OpenF1Auth } from '@/models/settings';
import { useLiveTiming, type LiveOptions, type LiveRow } from '@/hooks/useLiveTiming';
import { formatGap, formatLapTime, segmentTone } from '@/services/f1/openf1';
import { formatAge, formatTime } from '@/utils/dates';
import { TrackMapSvg } from './TrackMapSvg';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { WatchButton } from './WatchButton';

interface LiveTimingProps {
  auth: OpenF1Auth | null;
  enabled: boolean;
  simulate?: LiveOptions['simulate'];
  totalLaps?: number;
  favoriteCode?: string;
  now: Date;
}

export const COMPOUND: Record<string, { short: string; colour: string }> = {
  SOFT: { short: 'S', colour: '#e8002d' },
  MEDIUM: { short: 'M', colour: '#f5c518' },
  HARD: { short: 'H', colour: '#e8e6e1' },
  INTERMEDIATE: { short: 'I', colour: '#39b54a' },
  WET: { short: 'W', colour: '#0067ff' },
};

export const FLAG_LABEL: Record<string, string> = {
  sc: 'Safety car',
  vsc: 'Virtual safety car',
  red: 'Red flag',
  yellow: 'Yellow flag',
  chequered: 'Chequered flag',
  clear: 'Track clear',
};

export function Tyre({ compound, age }: { compound: string | null; age: number | null }) {
  const tyre = compound ? COMPOUND[compound] : undefined;
  return (
    <span className="tyre" title={compound ? `${compound}${age != null ? `, ${age} laps` : ''}` : undefined}>
      <span className="tyre__ring" style={{ borderColor: tyre?.colour ?? 'var(--rule)' }}>
        {tyre?.short ?? '·'}
      </span>
      {age != null && <span className="tyre__age num">{age}</span>}
    </span>
  );
}

function Segments({ codes }: { codes: number[] }) {
  if (!codes.length) return <span className="segs segs--empty" aria-hidden="true" />;
  return (
    <span className="segs" aria-hidden="true">
      {codes.map((c, i) => (
        <span key={i} className={`segs__cell segs__cell--${segmentTone(c)}`} />
      ))}
    </span>
  );
}

const GAP_MODES = [
  { value: 'gap', label: 'Gap' },
  { value: 'int', label: 'Int' },
];

function Row({ row, mode, fav }: { row: LiveRow; mode: string; fav: boolean }) {
  const gap = mode === 'gap' ? row.gapToLeader : row.interval;
  return (
    <li className={`lrow${fav ? ' lrow--fav' : ''}`}>
      <span className="lrow__pos num">{row.position ?? '–'}</span>
      <span className="lrow__bar" style={{ background: row.driver.colour }} aria-hidden="true" />
      <span className="lrow__code">{row.driver.code}</span>
      <span className="lrow__gap num">{row.position === 1 ? 'Leader' : formatGap(gap) || '–'}</span>
      <span className="lrow__lap num">
        {formatLapTime(row.lastLap)}
        <Segments codes={row.segments} />
      </span>
      <span className="lrow__best num">{formatLapTime(row.bestLap)}</span>
      <Tyre compound={row.compound} age={row.tyreAge} />
      <span className="lrow__pits num">{row.pits > 0 ? `${row.pits}` : ''}</span>
    </li>
  );
}

/**
 * Live timing during a session: leaderboard with gaps, last/best laps and mini-sectors,
 * tyres and stops; cars on the track map; race control and team radio. Needs an OpenF1
 * supporter token (Settings → Formula 1) except in simulated mode.
 */
export function LiveTiming({ auth, enabled, simulate, totalLaps, favoriteCode, now }: LiveTimingProps) {
  const live = useLiveTiming({ auth, enabled, simulate });
  const [mode, setMode] = useState('gap');

  if (!enabled || live.status === 'idle' || live.status === 'no-session') return null;

  if (live.status === 'needs-token') {
    return (
      <section className="live live--gate" aria-labelledby="live-title">
        <div className="live__head">
          <span className="live-dot" aria-hidden="true" />
          <span className="label label--accent">Live now</span>
          {live.session && <span className="label label--strong">{live.session.session_name}</span>}
        </div>
        <h2 id="live-title" className="live__title">
          Live timing needs your OpenF1 token
        </h2>
        <p className="meta" style={{ maxWidth: '60ch' }}>
          OpenF1 makes real-time data available to supporters (about €10 a month). Connect your account or paste a token in Settings and this
          block turns into a timing screen: gaps, laps, mini-sectors, tyres, cars on the map, race control and team radio.
        </p>
        <div className="btn-row">
          <Link to="/settings" className="btn btn--primary btn--sm">
            Connect OpenF1
          </Link>
          <WatchButton live size="sm" showTiming />
        </div>
      </section>
    );
  }

  if (live.status === 'searching' || live.status === 'loading' || (live.status === 'error' && live.rows.length === 0)) {
    return (
      <section className="live" aria-busy={live.status !== 'error'}>
        <div className="live__head">
          <span className="live-dot" aria-hidden="true" />
          <span className="label label--accent">{live.status === 'error' ? 'Live timing' : 'Connecting to live timing'}</span>
        </div>
        {live.status === 'error' ? <p className="notice notice--error">{live.error}</p> : <Skeleton variant="row" count={3} label="Loading live timing" />}
      </section>
    );
  }

  const session = live.session!;
  const isRace = session.session_type === 'Race';
  const cars = live.cars.map((c) => ({ ...c, top: c.position !== null && c.position <= 3, fav: c.code === favoriteCode }));

  return (
    <section className={`live live--${live.flag.kind}`} aria-labelledby="live-title">
      <div className="live__head">
        <span className="live-dot" aria-hidden="true" />
        <span className="label label--accent">{live.simulated ? 'Simulated live' : 'Live now'}</span>
        <span className="label label--strong">
          {session.session_name} · {session.circuit_short_name}
        </span>
        <span className={`tag live__flag live__flag--${live.flag.kind}`}>{FLAG_LABEL[live.flag.kind]}</span>
      </div>
      <div className="live__stats">
        <span className="live__lap num">
          {isRace ? (
            <>
              Lap {live.leaderLap}
              {totalLaps ? <small>/{totalLaps}</small> : null}
            </>
          ) : (
            <>
              {live.leaderLap}
              <small> laps run</small>
            </>
          )}
        </span>
        {live.weather && (
          <span className="live__wx">
            {live.weather.track != null && <span>Track {Math.round(live.weather.track)}°C</span>}
            {live.weather.air != null && <span>Air {Math.round(live.weather.air)}°C</span>}
            {live.weather.rain && <span className="live__rain">Rain</span>}
            {live.weather.wind != null && <span>Wind {Math.round(live.weather.wind)} m/s</span>}
          </span>
        )}
        <span className="meta">{live.updatedAt ? `Updated ${formatAge(live.updatedAt, now)}` : ''}</span>
      </div>

      {live.trace ? (
        <TrackMapSvg points={live.trace.points} width={live.trace.width} height={live.trace.height} cars={cars} tone={live.flag.kind} label={`${session.circuit_short_name} live positions`} />
      ) : (
        <p className="meta">The track map appears once the first laps are in.</p>
      )}

      <div className="live__toolbar">
        <span className="label">Timing</span>
        <Segmented options={GAP_MODES} value={mode} onChange={(v) => setMode(String(v))} ariaLabel="Gap mode" size="sm" />
      </div>
      <ol className="lboard" aria-label="Live classification">
        <li className="lrow lrow--head" aria-hidden="true">
          <span>#</span>
          <span />
          <span>Drv</span>
          <span>{mode === 'gap' ? 'Gap' : 'Int'}</span>
          <span>Last</span>
          <span>Best</span>
          <span>Tyre</span>
          <span>Pit</span>
        </li>
        {live.rows.map((row) => (
          <Row key={row.driver.number} row={row} mode={mode} fav={row.driver.code === favoriteCode} />
        ))}
      </ol>

      <div className="live__grid">
        {live.control.length > 0 && (
          <div>
            <p className="label" style={{ marginBottom: 6 }}>
              Race control
            </p>
            <ul className="feed">
              {live.control.slice(0, 6).map((c, i) => (
                <li key={`${c.t}-${i}`} className="feed__item">
                  <span className="feed__when num">{c.lap ? `L${c.lap}` : formatTime(new Date(c.t))}</span>
                  <span>{c.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {live.radio.length > 0 && (
          <div>
            <p className="label" style={{ marginBottom: 6 }}>
              Team radio
            </p>
            <ul className="feed">
              {live.radio.slice(0, 4).map((r) => {
                const driver = live.rows.find((x) => x.driver.number === r.driver)?.driver;
                return (
                  <li key={`${r.t}-${r.driver}`} className="feed__item feed__item--radio">
                    <span className="feed__when num">{formatTime(new Date(r.t))}</span>
                    <span className="feed__driver" style={{ borderColor: driver?.colour }}>
                      {driver?.code ?? r.driver}
                    </span>
                    <audio controls preload="none" src={r.url} className="feed__audio" />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      {live.error && <p className="notice notice--warn">{live.error}</p>}
      <p className="meta">Timing from the OpenF1 API, a few seconds behind the track. Gaps are as published; car positions come from GPS.</p>
    </section>
  );
}
