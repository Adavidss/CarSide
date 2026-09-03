import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted fonts (OFL) — only the weights CarSide uses, latin subset.
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-500.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';

import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// App-shell service worker for offline-ish loads. Production only, so dev never caches.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* offline support is optional */
    });
  });
}
