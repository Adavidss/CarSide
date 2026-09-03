import type { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <a href="#main" className="visually-hidden">
        Skip to content
      </a>
      <Header />
      <main id="main" className="app-main">
        <div className="container">{children}</div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
