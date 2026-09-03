import type { CarEvent } from '@/models/events';
import { downloadEventIcs } from '@/utils/calendar';
import { appleMapsUrl, googleDirectionsUrl, googleSearchUrl, isApplePlatform } from '@/utils/maps';
import { IconCalendar, IconDirections, IconExternal } from '@/components/icons/Icons';
import { SaveButton } from './SaveButton';

interface EventActionsProps {
  event: CarEvent;
}

export function directionsHref(event: CarEvent): string | undefined {
  if (event.latitude != null && event.longitude != null) {
    return isApplePlatform()
      ? appleMapsUrl(event.latitude, event.longitude, event.venue ?? event.title)
      : googleDirectionsUrl(event.latitude, event.longitude);
  }
  if (event.address) return googleSearchUrl(event.address);
  return undefined;
}

/** Full action row for the detail view: directions, calendar, save, event page. */
export function EventActions({ event }: EventActionsProps) {
  const directions = directionsHref(event);
  const apple = isApplePlatform();
  return (
    <div className="event-actions btn-row">
      {directions && (
        <a className="btn btn--primary" href={directions} target="_blank" rel="noreferrer">
          <IconDirections />
          Directions
        </a>
      )}
      <button type="button" className="btn" onClick={() => downloadEventIcs(event)}>
        <IconCalendar />
        Add to calendar
      </button>
      <SaveButton event={event} size="md" showLabel />
      {event.url && (
        <a className="btn btn--ghost" href={event.url} target="_blank" rel="noreferrer">
          <IconExternal />
          Event page
        </a>
      )}
      {apple && event.latitude != null && event.longitude != null && (
        <a className="btn btn--link" href={googleDirectionsUrl(event.latitude, event.longitude)} target="_blank" rel="noreferrer">
          Open in Google Maps
        </a>
      )}
    </div>
  );
}
