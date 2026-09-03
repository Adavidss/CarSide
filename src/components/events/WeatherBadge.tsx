import type { EventWeather } from '@/hooks/useWeather';

interface WeatherBadgeProps {
  weather: EventWeather | null | undefined;
  showVerdict?: boolean;
}

/** "72° · CLEAR · GOOD SHOW WEATHER" — hidden entirely when there is no forecast. */
export function WeatherBadge({ weather, showVerdict = true }: WeatherBadgeProps) {
  if (!weather) return null;
  const { snapshot, verdict } = weather;
  return (
    <span className={`wx wx--${verdict.tone}`} title={`${snapshot.label}, ${snapshot.precipitationProbability}% chance of rain`}>
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
