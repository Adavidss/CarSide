import type { CarEvent } from '@/models/events';
import type { F1Race, F1Session } from '@/models/f1';
import { buildIcs, downloadIcs, icsFilename, type IcsEvent } from './ics';
import { HOUR_MS } from './dates';

function eventLocation(event: CarEvent): string {
  return [event.venue, event.address ?? [event.city, event.region].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(', ');
}

export function eventToIcs(event: CarEvent): IcsEvent {
  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : new Date(start.getTime() + 3 * HOUR_MS);
  const notes = [event.subtitle, event.description, event.confirmWithOrganizer ? 'Confirm details with the organizer before heading out.' : undefined, event.url]
    .filter(Boolean)
    .join('\n\n');
  return {
    uid: `${event.id}@carside`,
    title: event.title,
    start,
    end,
    allDay: Boolean(event.allDay || event.timeTbd),
    location: eventLocation(event),
    description: notes,
    url: event.url,
  };
}

export function sessionToIcs(race: F1Race, session: F1Session): IcsEvent {
  return {
    uid: `f1-${race.season}-${race.round}-${session.key}@carside`,
    title: `F1 ${race.name} — ${session.label}`,
    start: new Date(session.start),
    end: new Date(session.end),
    location: `${race.circuitName}, ${race.locality}, ${race.country}`,
    description: `${race.name}, round ${race.round} of the ${race.season} season.${race.wikipediaUrl ? `\n${race.wikipediaUrl}` : ''}`,
    url: race.wikipediaUrl,
  };
}

export function downloadEventIcs(event: CarEvent): void {
  downloadIcs(icsFilename(event.title), buildIcs([eventToIcs(event)], event.title));
}

export function downloadSessionIcs(race: F1Race, session: F1Session): void {
  downloadIcs(icsFilename(`${race.name} ${session.label}`), buildIcs([sessionToIcs(race, session)], `F1 ${race.name}`));
}

export function downloadWeekendIcs(race: F1Race): void {
  downloadIcs(
    icsFilename(`${race.name} weekend`),
    buildIcs(
      race.sessions.map((session) => sessionToIcs(race, session)),
      `F1 ${race.name} weekend`,
    ),
  );
}

/** Every remaining Grand Prix (race sessions only) in one calendar file. */
export function downloadSeasonIcs(races: F1Race[], now: Date): void {
  const remaining = races.filter((race) => new Date(race.raceEnd).getTime() > now.getTime());
  const events = remaining.flatMap((race) => {
    const session = race.sessions.find((s) => s.key === 'race');
    return session ? [sessionToIcs(race, session)] : [];
  });
  if (!events.length) return;
  downloadIcs(icsFilename(`F1 ${remaining[0].season} remaining races`), buildIcs(events, `F1 ${remaining[0].season}`));
}
