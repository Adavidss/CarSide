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

export const IconFlag = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 21V4h12l-2 4 2 4H5" />
  </Icon>
);
