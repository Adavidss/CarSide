import { Link } from 'react-router-dom';
import type { F1Race } from '@/models/f1';
import { getCircuitMeta } from '@/services/f1/circuitMeta';
import { formatMonthDay, formatTime, formatWeekday } from '@/utils/dates';
import { Flag } from './Flag';

interface SeasonListProps {
  races: F1Race[];
  currentRound?: number;
  now: Date;
}

export function SeasonList({ races, currentRound, now }: SeasonListProps) {
  return (
    <ol aria-label="Season calendar">
      {races.map((race) => {
        const meta = getCircuitMeta(race.circuitId, race.country);
        const raceStart = new Date(race.raceStart);
        const past = new Date(race.raceEnd).getTime() < now.getTime();
        const current = race.round === currentRound;
        return (
          <li key={race.round} className={`round${past ? ' round--past' : ''}${current ? ' round--current' : ''}`}>
            <span className="round__num num">{String(race.round).padStart(2, '0')}</span>
            <span className="round__body">
              <Flag country={meta.country} title={race.country} />
              <span style={{ minWidth: 0 }}>
                <span className="round__name" style={{ display: 'block' }}>
                  <Link to={`/f1/round/${race.round}`} className="round__link">
                    {race.name}
                  </Link>
                  {race.sprintWeekend && (
                    <span className="tag" style={{ marginLeft: 8 }}>
                      Sprint
                    </span>
                  )}
                </span>
                <span className="round__circuit" style={{ display: 'block' }}>
                  {race.circuitName}
                </span>
              </span>
            </span>
            <span className="round__date num">
              {formatWeekday(raceStart, 'short')} {formatMonthDay(raceStart)}
              <small>{formatTime(raceStart)}</small>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
