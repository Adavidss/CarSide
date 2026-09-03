import { Link } from 'react-router-dom';
import { appConfig } from '@/config/appConfig';
import { useSettings } from '@/hooks/useSettings';
import { formatCoordinates } from '@/utils/distance';
import { localTimeZoneId } from '@/utils/dates';

export function Footer() {
  const { settings } = useSettings();
  return (
    <footer className="app-footer">
      <div className="container app-footer__inner">
        <div>
          <div className="app-footer__coords">
            {formatCoordinates(settings.location)} · {localTimeZoneId()}
          </div>
          <p>{appConfig.f1.disclaimer}</p>
        </div>
        <div className="app-footer__links">
          <Link to="/settings" className="link">
            Data sources
          </Link>
          <a href={appConfig.repoUrl} className="link" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
