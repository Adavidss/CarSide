import { useEffect, useRef } from 'react';
import { useLocationPanel } from '@/hooks/useLocationPanel';
import { IconClose } from '@/components/icons/Icons';
import { LocationForm } from './LocationForm';

/** Popover anchored under the header. Closes on Escape or an outside click. */
export function LocationPanel() {
  const { closePanel } = useLocationPanel();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel();
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current && !ref.current.contains(target) && !(target as Element).closest?.('.header-location')) {
        closePanel();
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [closePanel]);

  return (
    <div ref={ref} className="locpanel" role="dialog" aria-label="Change location">
      <div className="row row--between" style={{ marginBottom: 12 }}>
        <span className="label label--strong">Change location</span>
        <button type="button" className="btn btn--ghost btn--sm btn--icon" onClick={closePanel} aria-label="Close">
          <IconClose />
        </button>
      </div>
      <LocationForm onDone={closePanel} autoFocus />
    </div>
  );
}
