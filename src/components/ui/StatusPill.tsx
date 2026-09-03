interface StatusPillProps {
  tone: 'ok' | 'warn' | 'late' | 'bad' | 'neutral';
  label: string;
  /** Shown instead of `label` in compact density (see components.css). */
  shortLabel?: string;
  title?: string;
}

/** Small square indicator + uppercase label, e.g. the F1 watchability rating. */
export function StatusPill({ tone, label, shortLabel, title }: StatusPillProps) {
  return (
    <span className={`status${tone === 'neutral' ? '' : ` status--${tone}`}`} title={title}>
      <span className="status__dot" aria-hidden="true" />
      <span className="status__label">{label}</span>
      {shortLabel && (
        <span className="status__short" aria-hidden="true">
          {shortLabel}
        </span>
      )}
    </span>
  );
}
