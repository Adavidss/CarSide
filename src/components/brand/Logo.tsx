interface LogoProps {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * CarSide mark: a square tile with a heavy "C" drawn as a circuit corner.
 * The short accent segment at the top of the corner is the start/finish kerb.
 * Colours follow the theme tokens so it sits naturally in light and dark.
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
      <rect width="32" height="32" rx="3" fill="var(--fg)" />
      <path
        d="M22.75 24.04A10.5 10.5 0 1 1 22.75 7.96L19.54 11.79A5.5 5.5 0 1 0 19.54 20.21Z"
        fill="var(--bg)"
      />
      <path
        d="M18.72 5.86A10.5 10.5 0 0 1 23.03 8.2L19.68 11.91A5.5 5.5 0 0 0 17.42 10.69Z"
        fill="var(--accent)"
      />
    </svg>
  );
}
