import { formatDuration } from '@/utils/dates';

interface SessionProgressProps {
  start: Date;
  end: Date;
  now: Date;
}

/** Thin elapsed/remaining bar for a session that is under way (nominal length). */
export function SessionProgress({ start, end, now }: SessionProgressProps) {
  const total = Math.max(1, end.getTime() - start.getTime());
  const elapsed = Math.min(total, Math.max(0, now.getTime() - start.getTime()));
  const pct = (elapsed / total) * 100;
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Session progress">
      <div className="progress__track">
        <span className="progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress__meta">
        <span>{formatDuration(elapsed)} in</span>
        <span>~{formatDuration(total - elapsed)} left</span>
      </div>
    </div>
  );
}
