import type { Photo as PhotoData } from '@/services/wiki';

interface PhotoProps {
  photo: PhotoData | null | undefined;
  /** Shown while loading; keeps the layout from jumping. */
  loading?: boolean;
  /** Override the picture's own description. */
  caption?: string;
  /** Aspect ratio for the placeholder box, e.g. "3 / 2". */
  ratio?: string;
  className?: string;
  sizes?: string;
}

/**
 * Editorial photograph: square corners, hairline, caption and the credit the licence asks for.
 * Renders nothing when there is no photo, so pages degrade to type-only quietly.
 */
export function Photo({ photo, loading, caption, ratio = '3 / 2', className, sizes = '(min-width: 1024px) 720px, 100vw' }: PhotoProps) {
  if (!photo && !loading) return null;
  const aspect = photo ? `${photo.width} / ${photo.height}` : ratio;
  return (
    <figure className={['photo', className].filter(Boolean).join(' ')}>
      <div className="photo__frame" style={{ aspectRatio: aspect }}>
        {photo && <img className="photo__img" src={photo.src} width={photo.width} height={photo.height} alt={caption ?? photo.caption ?? ''} loading="lazy" decoding="async" sizes={sizes} />}
      </div>
      {photo && (
        <figcaption className="photo__caption">
          {(caption ?? photo.caption) && <span className="photo__text">{caption ?? photo.caption}</span>}
          <span className="photo__credit">
            <a href={photo.credit.pageUrl} target="_blank" rel="noreferrer">
              {photo.credit.artist}
            </a>
            {' · '}
            {photo.credit.licenseUrl ? (
              <a href={photo.credit.licenseUrl} target="_blank" rel="noreferrer">
                {photo.credit.license}
              </a>
            ) : (
              photo.credit.license
            )}
            {' · Wikimedia Commons'}
          </span>
        </figcaption>
      )}
    </figure>
  );
}
