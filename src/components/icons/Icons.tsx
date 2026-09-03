import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size, className, children, ...rest }: IconProps) {
  return (
    <svg
      className={['icon', className].filter(Boolean).join(' ')}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* Navigation */

export const IconHome = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h16M4 12h11M4 18h14" />
    <path d="M18 10v4M15 16v4" />
  </Icon>
);

export const IconHelmet = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 14a8 8 0 0 1 16 0v3a2 2 0 0 1-2 2H7a3 3 0 0 1-3-3z" />
    <path d="M11 12h9" />
  </Icon>
);

export const IconNearby = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconBookmark = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3h12v18l-6-4-6 4z" />
  </Icon>
);

export const IconBookmarkFilled = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3h12v18l-6-4-6 4z" fill="currentColor" />
  </Icon>
);

export const IconSettings = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h9M18 7h2M4 17h4M13 17h7" />
    <circle cx="15.5" cy="7" r="2.5" />
    <circle cx="10.5" cy="17" r="2.5" />
  </Icon>
);

/* Actions */

export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);

export const IconExternal = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" />
  </Icon>
);

export const IconCalendar = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
  </Icon>
);

export const IconDirections = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l9 9-9 9-9-9z" />
    <path d="M9 12h6M13 10l2 2-2 2" />
  </Icon>
);

export const IconClose = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const IconArrowLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);

export const IconArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const IconRefresh = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4.5h-4.5" />
  </Icon>
);

export const IconLocate = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="6" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </Icon>
);

export const IconEye = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const IconDensity = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 5.5h16M4 10h16M4 14.5h16M4 19h16" />
  </Icon>
);

/* Weather */

export const IconSun = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
  </Icon>
);

export const IconPartlyCloudy = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8.5" r="3.2" />
    <path d="M8 2.5v1.5M2.5 8.5H4M4.1 4.6l1 1M11 4.6l-1 1" />
    <path d="M9.5 20h8a3.5 3.5 0 0 0 .5-6.96A5 5 0 0 0 8.7 14.2 3 3 0 0 0 9.5 20z" />
  </Icon>
);

export const IconCloud = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 19h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 12.5 3.5 3.5 0 0 0 7 19z" />
  </Icon>
);

export const IconFog = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 14h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 7.5 3.5 3.5 0 0 0 7 14z" />
    <path d="M5 18h14M7 21h10" />
  </Icon>
);

export const IconRain = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 15h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 8.5 3.5 3.5 0 0 0 7 15z" />
    <path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3" />
  </Icon>
);

export const IconDrizzle = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 15h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 8.5 3.5 3.5 0 0 0 7 15z" />
    <path d="M9 18v1.5M13 18v1.5M17 18v1.5" />
  </Icon>
);

export const IconSnow = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 15h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 8.5 3.5 3.5 0 0 0 7 15z" />
    <path d="M9 18.5h.01M13 20.5h.01M17 18.5h.01" strokeWidth={2.6} />
  </Icon>
);

export const IconStorm = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 14h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 7.5 3.5 3.5 0 0 0 7 14z" />
    <path d="M13 14l-2.5 4H14l-2.5 4" />
  </Icon>
);

/* Event types */

export const IconCoffee = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
    <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M4 21h14" />
    <path d="M8.5 3.5c0 1.5 1.5 1.5 1.5 3M11.5 3.5c0 1.5 1.5 1.5 1.5 3" />
  </Icon>
);

export const IconCar = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 15l1.6-5.1A2 2 0 0 1 6.5 8.5h8.9a2 2 0 0 1 1.8 1.1L19.4 13H21v4h-2" />
    <path d="M3 15v2h2M9 17h6M6 12.5h11.5" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </Icon>
);

export const IconCheckerFlag = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 21V4h13l-2 4 2 4H5" />
    <path d="M9.5 4v8M14 4v8M5 8h13" />
  </Icon>
);

export const IconCone = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.5 4h5l3.5 15H6z" />
    <path d="M8.2 10h7.6M7.1 15h9.8M4 19h16" />
  </Icon>
);

export const IconTrackLoop = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 5h8a4 4 0 0 1 0 8h-6a3 3 0 0 0 0 6h8" />
    <path d="M4.5 5h3.5" />
    <circle cx="4.5" cy="5" r="1.2" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconMuseum = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 9l9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 18h18M3 21h18" />
  </Icon>
);

export const IconPennant = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 3v18M5 4h12l-3 4 3 4H5" />
  </Icon>
);

export const IconMeet = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="9.5" r="2.3" />
    <path d="M3 20a6 6 0 0 1 12 0M14.5 20a4.5 4.5 0 0 1 7-3.6" />
  </Icon>
);

export const IconGavel = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 4l7 7M10 7l7 7M4 20l7.5-7.5M13.5 10.5l-3 3M3 21h8" />
  </Icon>
);

export const IconDragTree = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v18" />
    <circle cx="8" cy="8" r="1.6" />
    <circle cx="16" cy="8" r="1.6" />
    <circle cx="8" cy="13" r="1.6" />
    <circle cx="16" cy="13" r="1.6" />
    <circle cx="8" cy="18" r="1.6" fill="currentColor" />
    <circle cx="16" cy="18" r="1.6" fill="currentColor" />
  </Icon>
);

export const IconStar = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </Icon>
);

/* Playback & views */

export const IconPlay = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4l13 8-13 8z" fill="currentColor" />
  </Icon>
);

export const IconPause = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor" />
  </Icon>
);

export const IconTv = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 6h18v12H3zM8 21h8M12 18v3" />
    <path d="M10 9.5l4 2.5-4 2.5z" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconRadar = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
  </Icon>
);

export const IconList = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h3M10 6h10M4 12h3M10 12h10M4 18h3M10 18h10" />
  </Icon>
);

export const IconShare = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v12M8 7l4-4 4 4M5 13v6h14v-6" />
  </Icon>
);

export const IconFlag = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 21V4h12l-2 4 2 4H5" />
  </Icon>
);
