export type WeatherKind = 'clear' | 'partly' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

export interface WeatherSnapshot {
  /** Local time the snapshot applies to (epoch ms). */
  time: number;
  temperatureF: number;
  precipitationProbability: number;
  weatherCode: number;
  kind: WeatherKind;
  /** "CLEAR", "PARTLY CLOUDY", "RAIN" … */
  label: string;
}

export type WeatherTone = 'ok' | 'warn' | 'bad';

export interface WeatherVerdict {
  /** "GOOD SHOW WEATHER", "RAIN LIKELY", "HOT ONE" … */
  label: string;
  tone: WeatherTone;
}
