export type EventType =
  | 'cars-and-coffee'
  | 'car-show'
  | 'classic'
  | 'exotic'
  | 'jdm'
  | 'european'
  | 'concours'
  | 'museum'
  | 'autocross'
  | 'track-day'
  | 'motorsport'
  | 'drag-racing'
  | 'festival'
  | 'meet'
  | 'auction'
  | 'other';

export type EventSetting = 'outdoor' | 'indoor' | 'mixed';

export interface EventSource {
  id: string;
  name: string;
  url?: string;
}

/** Normalised automotive event used everywhere in the UI. */
export interface CarEvent {
  /** Stable, provider-prefixed id, e.g. "curated:wake-county-speedway@2026-09-04". */
  id: string;
  title: string;
  /** Secondary line — a month's theme, series name, or venue caveat. */
  subtitle?: string;
  type: EventType;
  /** ISO 8601 with offset (or Z). */
  start: string;
  end?: string;
  /** Date-only event (multi-day festivals, race weekends). */
  allDay?: boolean;
  /** The date is confirmed but the organiser has not published a start time. */
  timeTbd?: boolean;
  venue?: string;
  address?: string;
  city: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  admission?: string;
  setting?: EventSetting;
  description?: string;
  /** Official event / organiser page. */
  url?: string;
  source: EventSource;
  /** Generated from a recurrence rule rather than a confirmed calendar entry. */
  recurring?: boolean;
  /** Organiser schedules drift — nudge the user to confirm before driving out. */
  confirmWithOrganizer?: boolean;
  verifiedOn?: string;
  notes?: string;
  tags?: string[];
}

export interface EventWithDistance extends CarEvent {
  /** Straight-line distance from the selected location, in miles. */
  distanceMiles?: number;
}

export type Weekday = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';

/** Lightweight recurrence used by curated feeds. Expanded client-side into concrete dates. */
export interface RecurrenceRule {
  freq: 'weekly' | 'monthly';
  weekday: Weekday;
  /** Monthly only: 1 = first <weekday>, 2 = second … -1 = last. */
  ordinal?: 1 | 2 | 3 | 4 | 5 | -1;
  /** Weekly only: every N weeks (default 1). Anchored to seasonStart when set. */
  interval?: number;
  /** "HH:MM" local to `timezone`. */
  startTime: string;
  endTime?: string;
  /** IANA zone, e.g. "America/New_York". */
  timezone: string;
  /** Inclusive "YYYY-MM-DD" bounds. */
  seasonStart?: string;
  seasonEnd?: string;
  /** 1–12; restrict to these months. */
  months?: number[];
  /** "YYYY-MM-DD" dates to skip. */
  exceptions?: string[];
}

/** One entry in a curated JSON feed. Either `start` or `recurrence` must be present. */
export interface CuratedEventEntry {
  id: string;
  title: string;
  subtitle?: string;
  type: EventType;
  start?: string;
  end?: string;
  allDay?: boolean;
  timeTbd?: boolean;
  recurrence?: RecurrenceRule | null;
  venue?: string;
  address?: string;
  city: string;
  region?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  admission?: string | null;
  setting?: EventSetting | null;
  description?: string;
  url?: string;
  source?: EventSource;
  confirmWithOrganizer?: boolean;
  verifiedOn?: string;
  notes?: string | null;
  tags?: string[];
}

export interface CuratedFeed {
  name?: string;
  url?: string;
  updated?: string;
  events: CuratedEventEntry[];
}

export interface EventSearchContext {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  from: Date;
  to: Date;
  signal?: AbortSignal;
}

export interface EventProvider {
  id: string;
  name: string;
  description?: string;
  getEvents(context: EventSearchContext): Promise<CarEvent[]>;
}

export interface EventProviderReport {
  providerId: string;
  providerName: string;
  count: number;
  error?: string;
  updatedAt?: string;
}

export interface EventSearchResult {
  events: EventWithDistance[];
  /** Events with coordinates that fell outside the radius — used for "expand radius" hints. */
  beyondRadius: EventWithDistance[];
  reports: EventProviderReport[];
}
