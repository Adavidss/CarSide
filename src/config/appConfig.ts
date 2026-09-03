/**
 * Central CarSide configuration. Change the defaults here rather than in the UI code.
 */
export const appConfig = {
  appName: 'CarSide',
  tagline: 'Racing. Shows. Weekends.',
  repoUrl: 'https://github.com/Adavidss/CarSide',

  /** Initial location for first-time users. Coordinates are the town centre. */
  defaultLocation: {
    label: 'Morrisville, NC 27560',
    latitude: 35.8235,
    longitude: -78.8256,
  },

  /** Default search radius around the selected location, in miles. */
  defaultRadiusMiles: 50,
  radiusOptions: [10, 25, 50, 75, 100, 150] as const,

  /** Days ahead the Home timeline and Nearby list look by default. */
  homeLookaheadDays: 7,
  nearbyLookaheadDays: 30,

  /**
   * Remote curated event feeds (JSON files using the same schema as src/data/events.json),
   * fetched in the browser at runtime — so the host must allow CORS (raw GitHub and Gist URLs do).
   * The default is a GitHub Gist: edit it to publish events without redeploying.
   */
  eventFeeds: [
    {
      name: 'CarSide Gist feed',
      url: 'https://gist.githubusercontent.com/Adavidss/26a1057481009287a63eb96bd44cc96d/raw/carside-events.json',
    },
  ] as ReadonlyArray<{ name: string; url: string }>,

  /** Weather is only meaningful for events inside the forecast horizon. */
  weatherForecastDays: 16,

  f1: {
    /** "current" or a season year such as "2026". */
    season: 'current',
    /** Time zone caption shown next to schedules. Overridden by the browser zone at runtime. */
    disclaimer:
      'CarSide is an independent fan project and is not affiliated with, endorsed by, or connected to Formula 1, the FIA, or Formula One Licensing B.V.',
  },
} as const;

export type RadiusOption = (typeof appConfig.radiusOptions)[number];
