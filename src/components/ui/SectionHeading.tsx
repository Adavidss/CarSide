import type { ReactNode } from 'react';

interface SectionHeadingProps {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  id?: string;
}

/**
 * Motorsport-style section rule: auto-numbered index, uppercase title, optional
 * right-aligned meta. The number comes from a CSS counter on `.page`.
 */
export function SectionHeading({ title, meta, actions, id }: SectionHeadingProps) {
  return (
    <div className="section__head">
      <span className="section__index" aria-hidden="true" />
      <h2 className="section__title" id={id}>
        {title}
      </h2>
      {meta !== undefined && <span className="section__meta">{meta}</span>}
      {actions}
    </div>
  );
}
