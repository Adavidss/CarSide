import { useEffect, useRef, useState } from 'react';
import { birthdayConfig } from '@/config/birthday';
import { appConfig } from '@/config/appConfig';
import { Logo } from '@/components/brand/Logo';

function shouldShow(): boolean {
  if (!birthdayConfig.enabled || !appConfig.birthdaySplashEnabled) return false;
  try {
    return localStorage.getItem(birthdayConfig.storageKey) === null;
  } catch {
    return false;
  }
}

/**
 * One-time first-run message. Dismissal is remembered in localStorage; after that
 * it never appears again. See src/config/birthday.ts to change or disable it.
 */
export function BirthdaySplash() {
  const [open, setOpen] = useState(shouldShow);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    buttonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function dismiss() {
    try {
      localStorage.setItem(birthdayConfig.storageKey, new Date().toISOString());
    } catch {
      // ignore
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="splash" role="dialog" aria-modal="true" aria-labelledby="splash-title">
      <div className="splash__inner">
        <div className="splash__brand">
          <Logo size={24} />
          <span className="label label--strong">{appConfig.appName}</span>
        </div>
        <h1 id="splash-title" className="splash__title">
          {birthdayConfig.heading}
        </h1>
        <p className="splash__text">{birthdayConfig.message}</p>
        <div className="splash__actions">
          <button ref={buttonRef} type="button" className="btn btn--primary" onClick={dismiss}>
            {birthdayConfig.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
