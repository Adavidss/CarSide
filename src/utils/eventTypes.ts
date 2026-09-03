import type { ComponentType, SVGProps } from 'react';
import type { EventType } from '@/models/events';
import {
  IconCar,
  IconCheckerFlag,
  IconCoffee,
  IconCone,
  IconDragTree,
  IconGavel,
  IconMeet,
  IconMuseum,
  IconPennant,
  IconStar,
  IconTrackLoop,
} from '@/components/icons/Icons';

type Glyph = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const GLYPHS: Record<EventType, Glyph> = {
  'cars-and-coffee': IconCoffee,
  'car-show': IconCar,
  classic: IconCar,
  exotic: IconCar,
  jdm: IconCar,
  european: IconCar,
  concours: IconStar,
  museum: IconMuseum,
  autocross: IconCone,
  'track-day': IconTrackLoop,
  motorsport: IconCheckerFlag,
  'drag-racing': IconDragTree,
  festival: IconPennant,
  meet: IconMeet,
  auction: IconGavel,
  other: IconPennant,
};

/** Small line glyph for an event type — a scanning cue, not decoration. */
export function eventTypeIcon(type: EventType): Glyph {
  return GLYPHS[type] ?? IconPennant;
}

const LABELS: Record<EventType, string> = {
  'cars-and-coffee': 'Cars & Coffee',
  'car-show': 'Car show',
  classic: 'Classic show',
  exotic: 'Exotics',
  jdm: 'JDM meet',
  european: 'European meet',
  concours: 'Concours',
  museum: 'Museum',
  autocross: 'Autocross',
  'track-day': 'Track day',
  motorsport: 'Motorsport',
  'drag-racing': 'Drag racing',
  festival: 'Festival',
  meet: 'Meet',
  auction: 'Auction',
  other: 'Event',
};

export function eventTypeLabel(type: EventType): string {
  return LABELS[type] ?? LABELS.other;
}

export type EventGroup = 'all' | 'meets' | 'shows' | 'motorsport' | 'track';

const GROUPS: Record<EventType, Exclude<EventGroup, 'all'>> = {
  'cars-and-coffee': 'meets',
  meet: 'meets',
  jdm: 'meets',
  european: 'meets',
  exotic: 'meets',
  'car-show': 'shows',
  classic: 'shows',
  concours: 'shows',
  museum: 'shows',
  festival: 'shows',
  auction: 'shows',
  other: 'shows',
  motorsport: 'motorsport',
  'drag-racing': 'motorsport',
  autocross: 'track',
  'track-day': 'track',
};

export function eventGroup(type: EventType): Exclude<EventGroup, 'all'> {
  return GROUPS[type] ?? 'shows';
}

export const EVENT_GROUP_OPTIONS: Array<{ value: EventGroup; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'meets', label: 'Cars & Coffee' },
  { value: 'shows', label: 'Shows' },
  { value: 'motorsport', label: 'Racing' },
  { value: 'track', label: 'Track' },
];

export function settingLabel(setting: 'outdoor' | 'indoor' | 'mixed' | undefined): string | undefined {
  if (!setting) return undefined;
  return setting === 'mixed' ? 'Indoor / outdoor' : setting.charAt(0).toUpperCase() + setting.slice(1);
}
