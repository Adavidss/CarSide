import { useState } from 'react';
import type { CarEvent } from '@/models/events';
import { downloadEventIcs } from '@/utils/calendar';
import { appleMapsUrl, googleDirectionsUrl, googleSearchUrl, isApplePlatform } from '@/utils/maps';
import { formatDateLong, formatTimeRange } from '@/utils/dates';
import { IconCalendar, IconDirections, IconExternal, IconShare } from '@/components/icons/Icons';
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

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Full action row for the detail view: directions, calendar, save, share, copy address, event page. */
export function EventActions({ event }: EventActionsProps) {
  const directions = directionsHref(event);
  const apple = isApplePlatform();
  const [copied, setCopied] = useState<'address' | 'link' | null>(null);
  const address = event.address ?? [event.venue, event.city, event.region].filter(Boolean).join(', ');

  function flash(kind: 'address' | 'link') {
    setCopied(kind);
    window.setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1800);
  }

  async function share() {
    const start = new Date(event.start);
    const text = `${event.title} — ${formatDateLong(start)}${event.allDay || event.timeTbd ? '' : ` · ${formatTimeRange(start, event.end ? new Date(event.end) : undefined)}`}${event.venue ? ` · ${event.venue}` : ''}, ${event.city}`;
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: event.title, text, url });
        return;
      } catch {
        // user dismissed or share unavailable — fall through to copy
      }
    }
    if (await copyText(`${text}\n${url}`)) flash('link');
  }

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
      <button type="button" className="btn btn--ghost" onClick={share}>
        <IconShare />
        {copied === 'link' ? 'Link copied' : 'Share'}
      </button>
      {address && (
        <button
          type="button"
          className="btn btn--ghost"
          onClick={async () => {
            if (await copyText(address)) flash('address');
          }}
        >
          {copied === 'address' ? 'Address copied' : 'Copy address'}
        </button>
      )}
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
