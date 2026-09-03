import type { ConstructorStanding, DriverStanding, Standings } from '@/models/f1';
import { teamColor } from '@/services/f1/teamColors';

interface DriverTableProps {
  standings: Standings<DriverStanding>;
  limit?: number;
}

interface ConstructorTableProps {
  standings: Standings<ConstructorStanding>;
}

export function DriverStandingsTable({ standings, limit }: DriverTableProps) {
  const rows = limit ? standings.entries.slice(0, limit) : standings.entries;
  return (
    <ol aria-label="Drivers' championship standings">
      <li className="srow srow--head" aria-hidden="true">
        <span>#</span>
        <span>Driver</span>
        <span>Pts</span>
      </li>
      {rows.map((d) => (
        <li key={d.driverId} className={`srow${d.position <= 3 ? ' srow--top' : ''}`}>
          <span className="srow__pos num">{d.position}</span>
          <span className="srow__name">
            <span className="srow__bar" style={{ ['--team' as string]: teamColor(d.constructorId) }} aria-hidden="true" />
            <span className="srow__code">{d.code}</span>
            <span style={{ minWidth: 0 }}>
              <span className="srow__driver" style={{ display: 'block' }}>
                {d.givenName} {d.familyName}
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
        </li>
      ))}
    </ol>
  );
}

export function ConstructorStandingsTable({ standings }: ConstructorTableProps) {
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
        </li>
      ))}
    </ol>
  );
}
