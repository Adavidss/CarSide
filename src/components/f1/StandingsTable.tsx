import { Link } from 'react-router-dom';
import type { ConstructorStanding, DriverStanding, Standings } from '@/models/f1';
import { teamColor } from '@/services/f1/teamColors';

interface DriverTableProps {
  standings: Standings<DriverStanding>;
  limit?: number;
  /** Jolpica driverId of the user's driver — highlighted. */
  favoriteId?: string;
}

interface ConstructorTableProps {
  standings: Standings<ConstructorStanding>;
}

function Meter({ points, max, color }: { points: number; max: number; color?: string }) {
  if (max <= 0) return null;
  return <span className="srow__meter" style={{ width: `${Math.max(1, (points / max) * 100)}%`, background: color ?? 'var(--fg-3)' }} aria-hidden="true" />;
}

export function DriverStandingsTable({ standings, limit, favoriteId }: DriverTableProps) {
  const rows = limit ? standings.entries.slice(0, limit) : standings.entries;
  const max = standings.entries[0]?.points ?? 0;
  return (
    <ol aria-label="Drivers' championship standings">
      <li className="srow srow--head" aria-hidden="true">
        <span>#</span>
        <span>Driver</span>
        <span>Pts</span>
      </li>
      {rows.map((d) => (
        <li key={d.driverId} className={`srow${d.position <= 3 ? ' srow--top' : ''}${d.driverId === favoriteId ? ' srow--fav' : ''}`}>
          <span className="srow__pos num">{d.position}</span>
          <span className="srow__name">
            <span className="srow__bar" style={{ ['--team' as string]: teamColor(d.constructorId) }} aria-hidden="true" />
            <span className="srow__code">{d.code}</span>
            <span style={{ minWidth: 0 }}>
              <span className="srow__driver" style={{ display: 'block' }}>
                <Link to={`/f1/driver/${d.driverId}`} className="srow__link">
                  {d.givenName} {d.familyName}
                </Link>
              </span>
              <span className="srow__team" style={{ display: 'block' }}>
                {d.constructorName}
              </span>
            </span>
          </span>
          <span className="srow__pts num">
            {d.points}
            {d.wins > 0 && <small>{d.wins} {d.wins === 1 ? 'win' : 'wins'}</small>}
          </span>
          <Meter points={d.points} max={max} color={teamColor(d.constructorId)} />
        </li>
      ))}
    </ol>
  );
}

export function ConstructorStandingsTable({ standings }: ConstructorTableProps) {
  const max = standings.entries[0]?.points ?? 0;
  return (
    <ol aria-label="Constructors' championship standings">
      <li className="srow srow--head" aria-hidden="true">
        <span>#</span>
        <span>Team</span>
        <span>Pts</span>
      </li>
      {standings.entries.map((c) => (
        <li key={c.constructorId} className={`srow${c.position <= 3 ? ' srow--top' : ''}`}>
          <span className="srow__pos num">{c.position}</span>
          <span className="srow__name">
            <span className="srow__bar" style={{ ['--team' as string]: teamColor(c.constructorId) }} aria-hidden="true" />
            <span className="srow__driver">{c.name}</span>
          </span>
          <span className="srow__pts num">
            {c.points}
            {c.wins > 0 && <small>{c.wins} {c.wins === 1 ? 'win' : 'wins'}</small>}
          </span>
          <Meter points={c.points} max={max} color={teamColor(c.constructorId)} />
        </li>
      ))}
    </ol>
  );
}
