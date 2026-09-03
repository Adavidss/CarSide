import type { CarEvent } from '@/models/events';
import { haversineMiles } from '@/utils/distance';
import { normalizeTitle, titleSimilarity } from '@/utils/id';

/** Local calendar date of the event start in its own offset, e.g. "2026-09-05". */
function startDate(event: CarEvent): string {
  return event.start.slice(0, 10);
}

function titlesMatch(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return true;
  // "cars and coffee morrisville" vs "cars and coffee morrisville motorcycle day"
  if (na.length >= 8 && nb.length >= 8 && (nb.startsWith(na + ' ') || na.startsWith(nb + ' '))) return true;
  return titleSimilarity(a, b) >= 0.6;
}

function looksLikeSameEvent(a: CarEvent, b: CarEvent): boolean {
  if (startDate(a) !== startDate(b)) return false;
  if (!titlesMatch(a.title, b.title)) return false;
  if (a.latitude != null && a.longitude != null && b.latitude != null && b.longitude != null) {
    return (
      haversineMiles(
        { latitude: a.latitude, longitude: a.longitude },
        { latitude: b.latitude, longitude: b.longitude },
      ) < 3
    );
  }
  return normalizeTitle(a.city) === normalizeTitle(b.city);
}

/**
 * Remove events that appear more than once (through several providers, or a
 * recurring rule plus a dated entry). Providers are passed in priority order,
 * but a dated, confirmed entry always beats an occurrence generated from a rule.
 */
export function dedupeEvents(events: CarEvent[]): CarEvent[] {
  const kept: CarEvent[] = [];
  const seenIds = new Set<string>();
  for (const event of events) {
    if (seenIds.has(event.id)) continue;
    const index = kept.findIndex((k) => looksLikeSameEvent(k, event));
    if (index === -1) {
      seenIds.add(event.id);
      kept.push(event);
      continue;
    }
    const existing = kept[index];
    if (existing.recurring && !event.recurring) {
      seenIds.delete(existing.id);
      seenIds.add(event.id);
      kept[index] = event;
    }
  }
  return kept;
}
