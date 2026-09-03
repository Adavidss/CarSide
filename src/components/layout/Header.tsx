import { Link, NavLink } from 'react-router-dom';
import { appConfig } from '@/config/appConfig';
import { Logo } from '@/components/brand/Logo';
import { IconChevronDown } from '@/components/icons/Icons';
import { useSettings } from '@/hooks/useSettings';
import { useLocationPanel } from '@/hooks/useLocationPanel';
import { LocationPanel } from '@/components/location/LocationPanel';

export const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/f1', label: 'F1' },
  { to: '/nearby', label: 'Nearby' },
  { to: '/saved', label: 'Saved' },
  { to: '/settings', label: 'Settings' },
] as const;

export function Header() {
  const { settings } = useSettings();
  const { open, togglePanel } = useLocationPanel();

  return (
    <header className="app-header">
      <div className="container app-header__inner">
        <Link to="/" className="brand" aria-label={`${appConfig.appName} home`}>
          <Logo className="brand__mark" />
          <span className="brand__name">{appConfig.appName}</span>
          <span className="brand__tag hide-mobile">{appConfig.tagline}</span>
        </Link>

        <nav className="top-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) => `top-nav__link${isActive ? ' is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <span className="header-spacer" />

        <button
          type="button"
          className="header-location"
          onClick={togglePanel}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={`Location: ${settings.location.label}, ${settings.radiusMiles} mile radius. Change location`}
        >
          <span className="header-location__label">{settings.location.label}</span>
          <span className="header-location__radius">{settings.radiusMiles} mi</span>
          <IconChevronDown className="header-location__chev" />
        </button>
      </div>
      {open && <LocationPanel />}
    </header>
  );
}
