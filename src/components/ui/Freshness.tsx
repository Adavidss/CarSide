import type { LoadSource } from '@/services/cache';
import { formatAge } from '@/utils/dates';
import { IconRefresh } from '@/components/icons/Icons';

interface FreshnessProps {
  updatedAt: number | null;
  stale: boolean;
  source?: LoadSource;
  onReload?: () => void;
  now?: Date;
}

/** "Updated 12 min ago" / "Offline copy — may be out of date". */
export function Freshness({ updatedAt, stale, source, onReload, now = new Date() }: FreshnessProps) {
  let text: string;
  if (source === 'fallback') text = 'Bundled schedule · live data unavailable';
  else if (stale && updatedAt) text = `Offline copy from ${formatAge(updatedAt, now)} · may be out of date`;
  else if (updatedAt) text = `Updated ${formatAge(updatedAt, now)}`;
  else text = 'Live data';

  return (
    <span className={`freshness${stale ? ' freshness--stale' : ''}`}>
      <span>{text}</span>
      {onReload && (
        <button type="button" className="btn btn--link" onClick={onReload} aria-label="Refresh data">
          <IconRefresh className="icon--sm" />
        </button>
      )}
    </span>
  );
}
