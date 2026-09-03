import { useSettings } from '@/hooks/useSettings';
import { useLocationPanel } from '@/hooks/useLocationPanel';

/** "Morrisville, NC 27560 · 50 mi · Change" for page headers. */
export function LocationLine({ prefix }: { prefix?: string }) {
  const { settings } = useSettings();
  const { openPanel } = useLocationPanel();
  return (
    <p className="page__context">
      {prefix && (
        <>
          <span>{prefix}</span>
          <span aria-hidden="true">·</span>
        </>
      )}
      <span>{settings.location.label}</span>
      <span aria-hidden="true">·</span>
      <span className="num">{settings.radiusMiles} mi</span>
      <span aria-hidden="true">·</span>
      <button type="button" className="btn btn--link" onClick={openPanel}>
        Change
      </button>
    </p>
  );
}
