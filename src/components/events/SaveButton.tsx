import type { CarEvent } from '@/models/events';
import { useSaved } from '@/hooks/useSaved';
import { IconBookmark, IconBookmarkFilled } from '@/components/icons/Icons';

interface SaveButtonProps {
  event: CarEvent;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function SaveButton({ event, size = 'sm', showLabel = false }: SaveButtonProps) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(event.id);
  return (
    <button
      type="button"
      className={`btn btn--ghost${size === 'sm' ? ' btn--sm' : ''}${showLabel ? '' : ' btn--icon'}${saved ? ' is-active' : ''}`}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${event.title} from saved` : `Save ${event.title}`}
      title={saved ? 'Saved' : 'Save'}
      onClick={() => toggle(event)}
    >
      {saved ? <IconBookmarkFilled /> : <IconBookmark />}
      {showLabel && (saved ? 'Saved' : 'Save')}
    </button>
  );
}
