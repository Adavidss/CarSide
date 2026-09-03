interface StatusPillProps {
  tone: 'ok' | 'warn' | 'late' | 'bad' | 'neutral';
  label: string;
  title?: string;
}

/** Small square indicator + uppercase label, e.g. the F1 watchability rating. */
export function StatusPill({ tone, label, title }: StatusPillProps) {
  return (
    <span className={`status${tone === 'neutral' ? '' : ` status--${tone}`}`} title={title}>
      <span className="status__dot" aria-hidden="true" />
      {label}
    </span>
  );
}
