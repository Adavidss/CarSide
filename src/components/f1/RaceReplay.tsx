import { useEffect, useMemo, useRef, useState } from 'react';
import type { F1Race } from '@/models/f1';
import { useLoaded } from '@/hooks/useResource';
import {
  carStateAt,
  flagStateAt,
  getRaceReplay,
  leaderLapAt,
  pointOnTrack,
  type ReplayModel,
} from '@/services/f1/openf1';
import { formatDuration } from '@/utils/dates';
import { IconPause, IconPlay } from '@/components/icons/Icons';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';

interface RaceReplayProps {
  race: F1Race;
}

const SPEEDS = [
  { value: 15, label: '15×' },
  { value: 60, label: '60×' },
  { value: 300, label: '300×' },
];

const COMPOUND: Record<string, { short: string; colour: string }> = {
  SOFT: { short: 'S', colour: '#e8002d' },
  MEDIUM: { short: 'M', colour: '#f5c518' },
  HARD: { short: 'H', colour: '#e8e6e1' },
  INTERMEDIATE: { short: 'I', colour: '#39b54a' },
  WET: { short: 'W', colour: '#0067ff' },
};

const FLAG_LABEL: Record<string, string> = {
  sc: 'Safety car',
  vsc: 'Virtual safety car',
  red: 'Red flag',
  yellow: 'Yellow flag',
  chequered: 'Chequered flag',
  clear: '',
};

function useReplayClock(model: ReplayModel | undefined) {
  const [t, setT] = useState<number>(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(60);
  const frame = useRef<number | null>(null);
  const last = useRef<number>(0);

  useEffect(() => {
    if (model) setT(model.start);
  }, [model]);

  useEffect(() => {
    if (!playing || !model) return;
    const tick = (now: number) => {
      if (last.current) {
        const dt = (now - last.current) * speed;
        setT((prev) => {
          const next = prev + dt;
          if (next >= model.end) {
            setPlaying(false);
            return model.end;
          }
          return next;
        });
      }
      last.current = now;
      frame.current = requestAnimationFrame(tick);
    };
    last.current = 0;
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [playing, speed, model]);

  return { t, setT, playing, setPlaying, speed, setSpeed };
}

/**
 * Data-driven replay of the last Grand Prix: cars lap the reference trace at their real
 * lap pace, the running order follows the timing feed, and flags come from race control.
 * Built from OpenF1's free post-session data — no video, no rights issues.
 */
export function RaceReplay({ race }: RaceReplayProps) {
  const resource = useLoaded((signal) => getRaceReplay(race.season, race.raceStart, signal), [race.season, race.raceStart]);
  const model = resource.data;
  const { t, setT, playing, setPlaying, speed, setSpeed } = useReplayClock(model);

  const view = useMemo(() => {
    if (!model) return null;
    const cars = model.drivers.map((d) => ({ driver: d, state: carStateAt(model, d.number, t) }));
    const order = [...cars].sort((a, b) => (a.state.position ?? 99) - (b.state.position ?? 99));
    return {
      cars,
      order,
      lap: Math.min(model.totalLaps, leaderLapAt(model, t)),
      flag: flagStateAt(model, t),
      elapsed: Math.max(0, t - model.start),
    };
  }, [model, t]);

  if (resource.status === 'loading') {
    return (
      <div className="replay replay--loading">
        <Skeleton variant="text" width="35%" />
        <div style={{ height: 12 }} />
        <Skeleton variant="row" count={2} label="Loading race replay" />
        <p className="meta">Fetching lap, position and race-control data from OpenF1 — about a megabyte the first time, then cached.</p>
      </div>
    );
  }

  if (!model || !view) {
    return <p className="meta">Race replay unavailable: {resource.error ?? 'no data'}.</p>;
  }

  const { width, height, points } = model.track;
  const pad = 8;
  const trace = points.length ? `M${points.map((p) => `${p[0]} ${p[1]}`).join('L')}Z` : '';
  const flagKind = view.flag.kind;

  return (
    <div className={`replay replay--${flagKind}`}>
      <div className="replay__head">
        <span className="label label--accent">Race replay</span>
        <span className="replay__lap num">
          Lap {view.lap}
          <small>/{model.totalLaps}</small>
        </span>
        <span className="replay__clock num">+{formatDuration(view.elapsed)}</span>
        {flagKind !== 'clear' && <span className={`tag replay__flag replay__flag--${flagKind}`}>{FLAG_LABEL[flagKind]}</span>}
      </div>

      {points.length > 0 ? (
        <svg className="replay__map" viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`} role="img" aria-label={`${model.circuit} track map with car positions`}>
          <path className="replay__trace" d={trace} />
          <circle className="replay__sf" cx={points[0][0]} cy={points[0][1]} r={1.8} />
          {[...view.cars].reverse().map(({ driver, state }) => {
            const p = pointOnTrack(model, state.progress);
            if (!p) return null;
            const top = state.position !== null && state.position <= 3;
            return (
              <g key={driver.number} className={`replay__car${top ? ' replay__car--top' : ''}`} transform={`translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`}>
                <circle r={top ? 2.6 : 2} fill={driver.colour} />
                {top && (
                  <text x={3.5} y={1.4} className="replay__code">
                    {driver.code}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      ) : (
        <p className="meta">No track trace for this race yet — the order and lap counter still replay below.</p>
      )}

      <div className="replay__controls">
        <button type="button" className="btn btn--primary btn--icon" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <input
          className="replay__scrub"
          type="range"
          min={model.start}
          max={model.end}
          step={1000}
          value={t}
          onChange={(e) => {
            setPlaying(false);
            setT(Number(e.target.value));
          }}
          aria-label="Race position"
        />
        <Segmented options={SPEEDS} value={speed} onChange={(value) => setSpeed(Number(value))} ariaLabel="Replay speed" size="sm" />
      </div>

      <ol className="replay__order" aria-label="Running order">
        {view.order.map(({ driver, state }) => {
          const tyre = state.compound ? COMPOUND[state.compound] : undefined;
          return (
            <li key={driver.number} className="replay__row">
              <span className="replay__pos num">{state.position ?? '–'}</span>
              <span className="replay__bar" style={{ background: driver.colour }} aria-hidden="true" />
              <span className="replay__driver">{driver.code}</span>
              <span className="replay__tyre" style={{ borderColor: tyre?.colour ?? 'var(--rule)' }} title={state.compound ?? undefined}>
                {tyre?.short ?? '·'}
              </span>
              <span className="replay__laps num">{state.lap > 0 ? `L${state.lap}` : 'Grid'}</span>
            </li>
          );
        })}
      </ol>

      {view.flag.message && <p className="replay__ticker">Race control: {view.flag.message}</p>}
      <p className="meta">
        Cars move along the reference lap at their real lap pace, so gaps are approximate within a lap. Data from the OpenF1 API after the session ended.
      </p>
    </div>
  );
}
