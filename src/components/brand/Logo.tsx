interface LogoProps {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * CarSide mark: a single open lap — a monoline "C" — with the start/finish kerb
 * picked out in the accent colour. No tile, no fill; it inherits the text colour,
 * so it sits quietly in both themes and still reads at favicon size.
 */
export function Logo({ size = 28, className, title = 'CarSide' }: LogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      focusable="false"
    >
      <path d="M22.75 7.96A10.5 10.5 0 1 0 22.75 24.04" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M22.75 7.96A10.5 10.5 0 0 0 17.82 5.66" fill="none" stroke="var(--accent)" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}
