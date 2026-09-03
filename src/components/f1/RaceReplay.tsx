import { useEffect, useMemo, useRef, useState } from 'react';
import type { F1Race } from '@/models/f1';
import { useLoaded } from '@/hooks/useResource';
import { carStateAt, flagStateAt, formatLapTime, getRaceReplay, leaderLapAt, pointOnTrack, type ReplayModel } from '@/services/f1/openf1';
import { formatDuration } from '@/utils/dates';
import { IconPause, IconPlay } from '@/components/icons/Icons';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { TrackMapSvg } from './TrackMapSvg';
import { FLAG_LABEL, Tyre } from './LiveTiming';

interface RaceReplayProps {
  race: F1Race;
  favoriteCode?: string;
}

const SPEEDS = [
  { value: 15, label: '15×' },
  { value: 60, label: '60×' },
  { value: 300, label: '300×' },
];

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
 * lap pace, the order follows the timing feed, and flags, overtakes, pit stops and team
 * radio play back in sync with the scrubber. Free OpenF1 data — no video, no rights issues.
 */
export function RaceReplay({ race, favoriteCode }: RaceReplayProps) {
  const resource = useLoaded((signal) => getRaceReplay(race.season, race.raceStart, signal), [race.season, race.raceStart]);
  const model = resource.data;
  const { t, setT, playing, setPlaying, speed, setSpeed } = useReplayClock(model);

  const view = useMemo(() => {
    if (!model) return null;
    const cars = model.drivers.map((d) => ({ driver: d, state: carStateAt(model, d.number, t) }));
    const order = [...cars].sort((a, b) => (a.state.position ?? 99) - (b.state.position ?? 99));
    const code = (num: number) => model.drivers.find((d) => d.number === num)?.code ?? String(num);
    const overtake = [...model.overtakes].reverse().find((o) => o[0] <= t);
    return {
      cars,
      order,
      lap: Math.min(model.totalLaps, leaderLapAt(model, t)),
      flag: flagStateAt(model.events, t),
      elapsed: Math.max(0, t - model.start),
      control: [...model.control].reverse().filter((c) => c[0] <= t).slice(0, 5),
      radio: [...model.radio].reverse().filter((r) => r[0] <= t).slice(0, 4),
      overtake: overtake ? { t: overtake[0], text: `P${overtake[3]}: ${code(overtake[1])} passes ${code(overtake[2])}` } : null,
      code,
    };
  }, [model, t]);

  if (resource.status === 'loading') {
    return (
      <div className="replay replay--loading">
        <Skeleton variant="text" width="35%" />
        <div style={{ height: 12 }} />
        <Skeleton variant="row" count={2} label="Loading race replay" />
        <p className="meta">Fetching laps, positions, pit stops, radio and race control from OpenF1 — about a megabyte the first time, then cached.</p>
      </div>
    );
  }

  if (!model || !view) {
    return <p className="meta">Race replay unavailable: {resource.error ?? 'no data'}.</p>;
  }

  const cars = view.cars
    .map(({ driver, state }) => {
      const p = pointOnTrack(model, state.progress);
      return p ? { number: driver.number, colour: driver.colour, code: driver.code, x: p[0], y: p[1], top: state.position !== null && state.position <= 3, fav: driver.code === favoriteCode } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
  const flagKind = view.flag.kind;
  // The scrubber steps in whole seconds, so it can stop just short of the exact end.
  const finished = t >= model.end - 1_500;
  const swing = Object.entries(model.swing)
    .map(([num, s]) => ({ num: Number(num), ...s }))
    .sort((a, b) => (a.posAfter ?? 99) - (b.posAfter ?? 99))
    .slice(0, 5);

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

      {model.track.points.length > 1 ? (
        <TrackMapSvg points={model.track.points} width={model.track.width} height={model.track.height} cars={cars} tone={flagKind} label={`${model.circuit} track map with car positions`} />
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

      {view.overtake && (
        <p className="replay__ticker replay__ticker--accent" aria-live="polite">
          Overtake · {view.overtake.text}
        </p>
      )}

      <ol className="lboard" aria-label="Running order">
        <li className="lrow lrow--head lrow--replay" aria-hidden="true">
          <span>#</span>
          <span />
          <span>Drv</span>
          <span>Lap</span>
          <span>Last</span>
          <span>Best</span>
          <span>Tyre</span>
          <span>Pit</span>
        </li>
        {view.order.map(({ driver, state }) => (
          <li key={driver.number} className={`lrow lrow--replay${driver.code === favoriteCode ? ' lrow--fav' : ''}`}>
            <span className="lrow__pos num">{state.position ?? '–'}</span>
            <span className="lrow__bar" style={{ background: driver.colour }} aria-hidden="true" />
            <span className="lrow__code">{driver.code}</span>
            <span className="lrow__gap num">{state.lap > 0 ? `L${state.lap}` : 'Grid'}</span>
            <span className="lrow__lap num">{formatLapTime(state.lastLap)}</span>
            <span className="lrow__best num">{formatLapTime(state.bestLap)}</span>
            <Tyre compound={state.compound} age={state.tyreAge} />
            <span className="lrow__pits num">{state.pits > 0 ? `${state.pits}` : ''}</span>
          </li>
        ))}
      </ol>

      <div className="live__grid">
        {view.control.length > 0 && (
          <div>
            <p className="label" style={{ marginBottom: 6 }}>
              Race control
            </p>
            <ul className="feed">
              {view.control.map((c, i) => (
                <li key={`${c[0]}-${i}`} className="feed__item">
                  <span className="feed__when num">{c[1] ? `L${c[1]}` : '–'}</span>
                  <span>{c[3]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {view.radio.length > 0 && (
          <div>
            <p className="label" style={{ marginBottom: 6 }}>
              Team radio
            </p>
            <ul className="feed">
              {view.radio.map((r) => {
                const driver = model.drivers.find((d) => d.number === r[1]);
                return (
                  <li key={`${r[0]}-${r[1]}`} className="feed__item feed__item--radio">
                    <span className="feed__when num">+{formatDuration(Math.max(0, r[0] - model.start))}</span>
                    <span className="feed__driver" style={{ borderColor: driver?.colour }}>
                      {driver?.code ?? r[1]}
                    </span>
                    <audio controls preload="none" src={r[2]} className="feed__audio" />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {finished && swing.length > 0 && (
        <div>
          <p className="label" style={{ marginBottom: 6 }}>
            Championship after this race
          </p>
          <ul className="swing">
            {swing.map((s) => (
              <li key={s.num} className={`swing__row${view.code(s.num) === favoriteCode ? ' lrow--fav' : ''}`}>
                <span className="num">{s.posAfter ?? '–'}</span>
                <span className="lrow__code">{view.code(s.num)}</span>
                <span className="num">
                  {s.before} → <strong>{s.after}</strong>
                </span>
                <span className="meta">
                  +{s.after - s.before}
                  {s.posBefore !== null && s.posAfter !== null && s.posBefore !== s.posAfter ? ` · ${s.posBefore > s.posAfter ? '▲' : '▼'} from P${s.posBefore}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="meta">
        Cars move along the reference lap at their real lap pace, so gaps are approximate within a lap. Data from the OpenF1 API after the session ended.
      </p>
    </div>
  );
}
