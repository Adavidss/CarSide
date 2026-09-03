export interface TrackCar {
  number: number;
  colour: string;
  code: string;
  x: number;
  y: number;
  /** Label the car (P1–P3). */
  top?: boolean;
  /** The user's driver — drawn with a ring. */
  fav?: boolean;
}

import type { ReplayEventKind } from '@/services/f1/openf1';

interface TrackMapSvgProps {
  points: Array<[number, number]>;
  width: number;
  height: number;
  cars: TrackCar[];
  label: string;
  /** Track status; 'green' renders like 'clear'. */
  tone?: ReplayEventKind | 'clear';
  className?: string;
}

/** Circuit trace with car dots, shared by the live screen and the replay. */
export function TrackMapSvg({ points, width, height, cars, label, tone = 'clear', className }: TrackMapSvgProps) {
  if (points.length < 2) return null;
  const pad = 8;
  const trace = `M${points.map((p) => `${p[0]} ${p[1]}`).join('L')}Z`;
  return (
    <svg className={['tmap', `tmap--${tone === 'green' ? 'clear' : tone}`, className].filter(Boolean).join(' ')} viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`} role="img" aria-label={label}>
      <path className="tmap__trace" d={trace} />
      <circle className="tmap__sf" cx={points[0][0]} cy={points[0][1]} r={1.8} />
      {[...cars].reverse().map((car) => (
        <g key={car.number} className={`tmap__car${car.top ? ' tmap__car--top' : ''}${car.fav ? ' tmap__car--fav' : ''}`} transform={`translate(${car.x.toFixed(1)} ${car.y.toFixed(1)})`}>
          {car.fav && <circle r={4.2} className="tmap__ring" />}
          <circle r={car.top ? 2.6 : 2} fill={car.colour} />
          {(car.top || car.fav) && (
            <text x={3.6} y={1.4} className="tmap__code">
              {car.code}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
