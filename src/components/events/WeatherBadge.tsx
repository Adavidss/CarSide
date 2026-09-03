import type { ComponentType, SVGProps } from 'react';
import type { EventWeather } from '@/hooks/useWeather';
import type { WeatherKind } from '@/models/weather';
import { IconCloud, IconDrizzle, IconFog, IconPartlyCloudy, IconRain, IconSnow, IconStorm, IconSun } from '@/components/icons/Icons';

interface WeatherBadgeProps {
  weather: EventWeather | null | undefined;
  showVerdict?: boolean;
}

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

/** "☀ 72° · CLEAR · GOOD SHOW WEATHER" — hidden entirely when there is no forecast. */
export function WeatherBadge({ weather, showVerdict = true }: WeatherBadgeProps) {
  if (!weather) return null;
  const { snapshot, verdict } = weather;
  const Glyph = GLYPHS[snapshot.kind] ?? IconCloud;
  return (
    <span className={`wx wx--${verdict.tone}`} title={`${snapshot.label}, ${snapshot.precipitationProbability}% chance of rain`}>
      <Glyph className="wx__icon" />
      <span className="wx__temp">{snapshot.temperatureF}°</span>
      <span aria-hidden="true">·</span>
      <span className="wx__label">{snapshot.label}</span>
      {showVerdict && (
        <>
          <span className="wx__sep" aria-hidden="true">·</span>
          <span className="wx__verdict">{verdict.label}</span>
        </>
      )}
    </span>
  );
}
