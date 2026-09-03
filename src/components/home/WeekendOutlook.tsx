import type { ComponentType, SVGProps } from 'react';
import type { GeoPoint } from '@/models/location';
import type { WeatherKind } from '@/models/weather';
import { useDailyOutlook } from '@/hooks/useWeather';
import { isTopDownDay } from '@/services/weather/openMeteo';
import { dayKey, formatWeekday } from '@/utils/dates';
import { IconCloud, IconDrizzle, IconFog, IconPartlyCloudy, IconRain, IconSnow, IconStorm, IconSun } from '@/components/icons/Icons';

const GLYPHS: Record<WeatherKind, ComponentType<SVGProps<SVGSVGElement>>> = {
  clear: IconSun,
  partly: IconPartlyCloudy,
  cloud: IconCloud,
  fog: IconFog,
  drizzle: IconDrizzle,
  rain: IconRain,
  snow: IconSnow,
  storm: IconStorm,
};

interface WeekendOutlookProps {
  point: GeoPoint;
  /** Days to show (local dates), e.g. the coming Saturday and Sunday. */
  days: Date[];
}

/** "SAT 76° clear · SUN 64° rain 60%" — the weekend at a glance, with a nod to roof-down days. */
export function WeekendOutlook({ point, days }: WeekendOutlookProps) {
  const outlook = useDailyOutlook(point);
  if (!outlook) return null;
  const cells = days
    .map((d) => ({ date: d, day: outlook.find((o) => o.date === dayKey(d)) }))
    .filter((c): c is { date: Date; day: NonNullable<typeof c.day> } => !!c.day);
  if (!cells.length) return null;
  return (
    <div className="outlook" aria-label="Weekend outlook">
      {cells.map(({ date, day }) => {
        const Glyph = GLYPHS[day.kind] ?? IconCloud;
        const topDown = isTopDownDay(day);
        return (
          <span key={day.date} className="outlook__day" title={`${formatWeekday(date)}: ${day.label}, high ${day.high}°, ${day.precipitationProbability}% chance of rain`}>
            <span className="outlook__name">{formatWeekday(date, 'short')}</span>
            <Glyph className="outlook__icon" />
            <span className="outlook__temp num">{day.high}°</span>
            {day.precipitationProbability >= 25 && <span className="outlook__rain num">{day.precipitationProbability}%</span>}
            {topDown && <span className="tag tag--accent outlook__tag">Top-down day</span>}
          </span>
        );
      })}
    </div>
  );
}
