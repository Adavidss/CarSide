import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="page center-block">
      <p className="label label--lg">404</p>
      <h1 className="page__title" style={{ marginTop: 8 }}>
        Off track
      </h1>
      <p className="empty__text" style={{ marginTop: 12 }}>
        That page doesn't exist. Head back to the weekend.
      </p>
      <Link to="/" className="btn btn--sm">
        Home
      </Link>
    </div>
  );
}
