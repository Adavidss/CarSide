interface SkeletonProps {
  variant?: 'text' | 'title' | 'row';
  count?: number;
  width?: string;
  label?: string;
}

export function Skeleton({ variant = 'text', count = 1, width, label = 'Loading' }: SkeletonProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">{label}…</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`skeleton skeleton--${variant}`} style={width ? { width } : undefined} aria-hidden="true" />
      ))}
    </div>
  );
}
