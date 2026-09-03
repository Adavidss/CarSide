import type { F1Race, RaceResult } from '@/models/f1';
import { teamColor } from '@/services/f1/teamColors';
import { formatMonthDay } from '@/utils/dates';
import { IconEye } from '@/components/icons/Icons';

interface LastRaceProps {
  result: RaceResult;
  race?: F1Race;
  hidden: boolean;
  onReveal(): void;
}

/** Podium for the most recent race, gated by spoiler mode. */
export function LastRace({ result, race, hidden, onReveal }: LastRaceProps) {
  const date = new Date(`${result.date}T12:00:00Z`);
  return (
    <>
      <p className="meta" style={{ marginBottom: 12 }}>
        <strong>{result.raceName}</strong> · {race?.locality ?? result.circuitName} · {formatMonthDay(date)}
      </p>
      {hidden ? (
        <div className="spoiler">
          <div>
            <div className="spoiler__title">Race complete</div>
            <div className="meta">Results hidden — spoiler mode is on.</div>
          </div>
          <button type="button" className="btn btn--accent btn--sm" onClick={onReveal}>
            <IconEye />
            Reveal results
          </button>
        </div>
      ) : (
        <ol aria-label={`${result.raceName} results`}>
          {result.results.slice(0, 5).map((r) => (
            <li key={r.driverId} className={`srow${r.position <= 3 ? ' srow--top' : ''}`}>
              <span className="srow__pos num">{r.position}</span>
              <span className="srow__name">
                <span className="srow__bar" style={{ ['--team' as string]: teamColor(r.constructorId) }} aria-hidden="true" />
                <span className="srow__code">{r.code}</span>
                <span style={{ minWidth: 0 }}>
                  <span className="srow__driver" style={{ display: 'block' }}>
                    {r.givenName} {r.familyName}
                    {r.fastestLap && (
                      <span className="tag" style={{ marginLeft: 8 }}>
                        Fastest lap
                      </span>
                    )}
                  </span>
                  <span className="srow__team" style={{ display: 'block' }}>
                    {r.constructorName}
                  </span>
                </span>
              </span>
              <span className="srow__pts num">
                {r.gap ?? r.status}
                <small>
                  {r.points} {r.points === 1 ? 'pt' : 'pts'}
                </small>
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
