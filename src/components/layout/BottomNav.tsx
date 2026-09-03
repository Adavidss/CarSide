import { NavLink } from 'react-router-dom';
import { IconBookmark, IconHelmet, IconHome, IconNearby, IconSettings } from '@/components/icons/Icons';

const ITEMS = [
  { to: '/', label: 'Home', Icon: IconHome, end: true },
  { to: '/f1', label: 'F1', Icon: IconHelmet, end: false },
  { to: '/nearby', label: 'Nearby', Icon: IconNearby, end: false },
  { to: '/saved', label: 'Saved', Icon: IconBookmark, end: false },
  { to: '/settings', label: 'Settings', Icon: IconSettings, end: false },
];

/** Compact mobile navigation. Hidden at tablet widths and up (see components.css). */
export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {ITEMS.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `bottom-nav__link${isActive ? ' is-active' : ''}`}>
          <Icon />
          <span className="bottom-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
