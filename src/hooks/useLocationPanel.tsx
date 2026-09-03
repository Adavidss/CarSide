import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface LocationPanelContextValue {
  open: boolean;
  openPanel(): void;
  closePanel(): void;
  togglePanel(): void;
}

const LocationPanelContext = createContext<LocationPanelContextValue | null>(null);

/** Shared open/closed state for the header location popover, so any page can open it. */
export function LocationPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openPanel = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => setOpen(false), []);
  const togglePanel = useCallback(() => setOpen((v) => !v), []);
  const value = useMemo(() => ({ open, openPanel, closePanel, togglePanel }), [open, openPanel, closePanel, togglePanel]);
  return <LocationPanelContext.Provider value={value}>{children}</LocationPanelContext.Provider>;
}

export function useLocationPanel(): LocationPanelContextValue {
  const ctx = useContext(LocationPanelContext);
  if (!ctx) throw new Error('useLocationPanel must be used inside <LocationPanelProvider>');
  return ctx;
}
