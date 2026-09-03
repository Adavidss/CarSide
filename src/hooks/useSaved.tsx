import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CarEvent } from '@/models/events';

const STORAGE_KEY = 'carside:saved:v1';

export interface SavedEvent {
  event: CarEvent;
  savedAt: string;
}

function load(): SavedEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedEvent =>
        !!item && typeof item === 'object' && typeof (item as SavedEvent).event?.id === 'string',
    );
  } catch {
    return [];
  }
}

interface SavedContextValue {
  saved: SavedEvent[];
  isSaved(id: string): boolean;
  save(event: CarEvent): void;
  remove(id: string): void;
  toggle(event: CarEvent): void;
  clearPast(now?: Date): void;
}

const SavedContext = createContext<SavedContextValue | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<SavedEvent[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // best effort
    }
  }, [saved]);

  const isSaved = useCallback((id: string) => saved.some((s) => s.event.id === id), [saved]);

  const save = useCallback((event: CarEvent) => {
    setSaved((prev) => (prev.some((s) => s.event.id === event.id) ? prev : [...prev, { event, savedAt: new Date().toISOString() }]));
  }, []);

  const remove = useCallback((id: string) => {
    setSaved((prev) => prev.filter((s) => s.event.id !== id));
  }, []);

  const toggle = useCallback(
    (event: CarEvent) => {
      if (isSaved(event.id)) remove(event.id);
      else save(event);
    },
    [isSaved, remove, save],
  );

  const clearPast = useCallback((now: Date = new Date()) => {
    setSaved((prev) => prev.filter((s) => new Date(s.event.end ?? s.event.start).getTime() >= now.getTime()));
  }, []);

  const value = useMemo(() => ({ saved, isSaved, save, remove, toggle, clearPast }), [saved, isSaved, save, remove, toggle, clearPast]);
  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved(): SavedContextValue {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used inside <SavedProvider>');
  return ctx;
}
