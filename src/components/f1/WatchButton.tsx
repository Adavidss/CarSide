import { Link } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings';
import { LIVE_TIMING_URL, resolveWatch } from '@/services/f1/watch';
import { IconExternal, IconTv } from '@/components/icons/Icons';

interface WatchButtonProps {
  live: boolean;
  size?: 'sm' | 'md';
  showTiming?: boolean;
}

/** One tap to the user's broadcaster (Settings → Formula 1 → Where you watch). */
export function WatchButton({ live, size = 'md', showTiming = true }: WatchButtonProps) {
  const { settings } = useSettings();
  const watch = resolveWatch(settings.watch);
  const sm = size === 'sm' ? ' btn--sm' : '';
  return (
    <>
      {watch.url ? (
        <a className={`btn btn--accent${sm}`} href={watch.url} target="_blank" rel="noreferrer">
          <IconTv />
          {live ? `Watch live on ${watch.name}` : `Open ${watch.name}`}
        </a>
      ) : (
        <Link to="/settings" className={`btn btn--accent${sm}`}>
          <IconTv />
          Set where you watch
        </Link>
      )}
      {showTiming && (
        <a className={`btn btn--ghost${sm}`} href={LIVE_TIMING_URL} target="_blank" rel="noreferrer">
          <IconExternal />
          Live timing
        </a>
      )}
    </>
  );
}
