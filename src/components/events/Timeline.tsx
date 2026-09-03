import type { ReactNode } from 'react';
import type { TimelineItem } from '@/utils/timeline';
import type { EventWeather } from '@/hooks/useWeather';
import { groupByDay } from '@/utils/timeline';
import { formatMonthDay, formatWeekday, relativeDayLabel } from '@/utils/dates';
import { TimelineRow } from './TimelineRow';

interface TimelineProps {
  items: TimelineItem[];
  now: Date;
  weather?: Map<string, EventWeather>;
  compact?: boolean;
  renderExtraAction?: (item: TimelineItem) => ReactNode;
}

/** Day-grouped list of F1 sessions and local events in chronological order. */
export function Timeline({ items, now, weather, compact, renderExtraAction }: TimelineProps) {
  const groups = groupByDay(items, now);
  return (
    <div className="timeline">
      {groups.map((group) => {
        const relative = relativeDayLabel(group.date, now);
        return (
          <section key={group.key} className="timeline__day" aria-label={formatWeekday(group.date)}>
            <header className="timeline__dayhead">
              <h3 className="timeline__dayname">{formatWeekday(group.date)}</h3>
              <span className="timeline__daydate">{formatMonthDay(group.date)}</span>
              {relative && <span className="tag tag--solid timeline__daytag">{relative}</span>}
            </header>
            <ul>
              {group.items.map((item) => (
                <TimelineRow
                  key={item.id}
                  item={item}
                  now={now}
                  weather={weather?.get(item.id)}
                  compact={compact}
                  extraAction={renderExtraAction?.(item)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
