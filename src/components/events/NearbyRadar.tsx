import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { EventWithDistance } from '@/models/events';
import type { GeoPoint } from '@/models/location';
import { formatMiles } from '@/utils/distance';
import { eventGroup, eventTypeLabel } from '@/utils/eventTypes';
import { formatMonthDay, formatTime, formatWeekday } from '@/utils/dates';

interface NearbyRadarProps {
  events: EventWithDistance[];
  center: GeoPoint;
  radiusMiles: number;
}

const SIZE = 320;
const R = 140; // px for the outer ring
const MILES_PER_DEG = 69.172;

const GROUP_LABEL: Record<string, string> = {
  meets: 'Cars & Coffee & meets',
  shows: 'Shows',
  motorsport: 'Racing',
  track: 'Track & autocross',
};

function ringSteps(radius: number): number[] {
  return [radius / 4, radius / 2, radius].map((r) => Math.round(r));
}

/**
 * Instrument-style map: the selected location at the centre, distance rings, and one
 * dot per event placed by bearing and straight-line distance. No tiles, no SDK.
 */
export function NearbyRadar({ events, center, radiusMiles }: NearbyRadarProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scale = R / radiusMiles;
  const cosLat = Math.cos((center.latitude * Math.PI) / 180);

  const dots = useMemo(() => {
    const seen = new Map<string, number>();
    return events
      .filter((e) => e.latitude != null && e.longitude != null && (e.distanceMiles ?? Infinity) <= radiusMiles)
      .map((e) => {
        const dx = (e.longitude! - center.longitude) * cosLat * MILES_PER_DEG;
        const dy = (e.latitude! - center.latitude) * MILES_PER_DEG;
        // Nudge dots that share a venue so they don't stack exactly.
        const key = `${e.latitude!.toFixed(3)},${e.longitude!.toFixed(3)}`;
        const n = seen.get(key) ?? 0;
        seen.set(key, n + 1);
        const angle = (n * Math.PI) / 3;
        const jitter = n === 0 ? 0 : 7;
        return {
          event: e,
          x: SIZE / 2 + dx * scale + Math.cos(angle) * jitter,
          y: SIZE / 2 - dy * scale + Math.sin(angle) * jitter,
          group: eventGroup(e.type),
        };
      });
  }, [events, center.latitude, center.longitude, cosLat, scale, radiusMiles]);

  const selected = dots.find((d) => d.event.id === selectedId);

  return (
    <div className="radar">
      <svg className="radar__svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Map of ${dots.length} events within ${radiusMiles} miles`}>
        {ringSteps(radiusMiles).map((miles) => (
          <g key={miles}>
            <circle className="radar__ring" cx={SIZE / 2} cy={SIZE / 2} r={miles * scale} />
            <text className="radar__ring-label" x={SIZE / 2 + 4} y={SIZE / 2 - miles * scale - 4}>
              {miles} MI
            </text>
          </g>
        ))}
        <line className="radar__axis" x1={SIZE / 2} y1={14} x2={SIZE / 2} y2={SIZE - 14} />
        <line className="radar__axis" x1={14} y1={SIZE / 2} x2={SIZE - 14} y2={SIZE / 2} />
        <text className="radar__cardinal" x={SIZE / 2} y={10}>N</text>
        <text className="radar__cardinal" x={SIZE - 4} y={SIZE / 2 + 3} textAnchor="end">E</text>
        <text className="radar__cardinal" x={SIZE / 2} y={SIZE - 2}>S</text>
        <text className="radar__cardinal" x={4} y={SIZE / 2 + 3} textAnchor="start">W</text>
        <g className="radar__home" aria-hidden="true">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={3.5} />
        </g>
        {dots.map(({ event, x, y, group }) => (
          <g
            key={event.id}
            className={`radar__dot radar__dot--${group}${event.id === selectedId ? ' is-selected' : ''}`}
            transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
            role="button"
            tabIndex={0}
            aria-label={`${event.title}, ${formatMiles(event.distanceMiles)}`}
            onClick={() => setSelectedId(event.id === selectedId ? null : event.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedId(event.id === selectedId ? null : event.id);
              }
            }}
          >
            <circle className="radar__hit" r={11} />
            <circle className="radar__marker" r={5} />
          </g>
        ))}
      </svg>

      <div className="radar__legend" aria-hidden="true">
        {(['meets', 'shows', 'motorsport', 'track'] as const).map((g) => (
          <span key={g} className={`radar__key radar__key--${g}`}>
            <span className="radar__swatch" />
            {GROUP_LABEL[g]}
          </span>
        ))}
      </div>

      <div className="radar__caption" aria-live="polite">
        {selected ? (
          <Link to={`/nearby/${encodeURIComponent(selected.event.id)}`} className="radar__pick">
            <span className="radar__pick-title">{selected.event.title}</span>
            <span className="meta">
              {formatWeekday(new Date(selected.event.start), 'short')} {formatMonthDay(new Date(selected.event.start))}
              {!(selected.event.allDay || selected.event.timeTbd) && ` · ${formatTime(new Date(selected.event.start))}`} · {eventTypeLabel(selected.event.type)} ·{' '}
              {selected.event.city} · {formatMiles(selected.event.distanceMiles)}
            </span>
            <span className="label label--accent">Details</span>
          </Link>
        ) : (
          <span className="meta">
            {dots.length} {dots.length === 1 ? 'event' : 'events'} within {radiusMiles} mi of you. Tap a dot for details; distances are straight-line.
          </span>
        )}
      </div>
    </div>
  );
}
