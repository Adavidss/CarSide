import type { ConstructorStanding, DriverStanding, F1Race, Standings } from '@/models/f1';
import { computeTitleRace } from '@/utils/titleRace';
import { teamColor } from '@/services/f1/teamColors';

interface TitleRaceProps {
  drivers?: Standings<DriverStanding>;
  constructors?: Standings<ConstructorStanding>;
  races: F1Race[];
  now: Date;
  favoriteId?: string;
}

/** Championship maths: who is still in it, and what the leader needs. */
export function TitleRace({ drivers, constructors, races, now, favoriteId }: TitleRaceProps) {
  if (!drivers?.entries.length) return null;
  const d = computeTitleRace(
    drivers.entries.map((e) => ({ id: e.driverId, code: e.code, name: `${e.givenName} ${e.familyName}`, points: e.points, colour: teamColor(e.constructorId) })),
    races,
    now,
    'drivers',
  );
  const c = constructors?.entries.length
    ? computeTitleRace(
        constructors.entries.map((e) => ({ id: e.constructorId, code: e.name, name: e.name, points: e.points, colour: teamColor(e.constructorId) })),
        races,
        now,
        'constructors',
      )
    : null;

  return (
    <div className="title-race">
      <div className="title-race__summary">
        <span className="fact__value">
          {d.roundsLeft}
          <small>{d.roundsLeft === 1 ? 'round left' : 'rounds left'}</small>
        </span>
        <span className="fact__value">
          {d.maxRemaining}
          <small>driver pts available</small>
        </span>
        {d.sprintsLeft > 0 && (
          <span className="fact__value">
            {d.sprintsLeft}
            <small>{d.sprintsLeft === 1 ? 'sprint' : 'sprints'}</small>
          </span>
        )}
      </div>
      {d.note && <p className="title-race__note">{d.note}</p>}
      <div className="title-race__grid">
        <div>
          <p className="label" style={{ marginBottom: 6 }}>
            Drivers
          </p>
          <ul>
            {d.contenders.slice(0, 6).map((x) => (
              <li key={x.id} className={`trace-row${x.alive ? '' : ' trace-row--out'}${x.id === favoriteId ? ' lrow--fav' : ''}`}>
                <span className="lrow__bar" style={{ background: x.colour ?? 'var(--fg-3)' }} aria-hidden="true" />
                <span className="trace-row__name">{x.name}</span>
                <span className="num trace-row__pts">{x.points}</span>
                <span className="num trace-row__gap">{x.gap === 0 ? 'Leads' : `−${x.gap}`}</span>
                <span className={`tag${x.alive ? '' : ' trace-row__tag--out'}`}>{x.alive ? 'In it' : 'Out'}</span>
              </li>
            ))}
          </ul>
        </div>
        {c && (
          <div>
            <p className="label" style={{ marginBottom: 6 }}>
              Constructors
            </p>
            <ul>
              {c.contenders.slice(0, 4).map((x) => (
                <li key={x.id} className={`trace-row${x.alive ? '' : ' trace-row--out'}`}>
                  <span className="lrow__bar" style={{ background: x.colour ?? 'var(--fg-3)' }} aria-hidden="true" />
                  <span className="trace-row__name">{x.name}</span>
                  <span className="num trace-row__pts">{x.points}</span>
                  <span className="num trace-row__gap">{x.gap === 0 ? 'Leads' : `−${x.gap}`}</span>
                  <span className={`tag${x.alive ? '' : ' trace-row__tag--out'}`}>{x.alive ? 'In it' : 'Out'}</span>
                </li>
              ))}
            </ul>
            {c.note && <p className="title-race__note">{c.note}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
