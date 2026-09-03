import { dayIndex, getArticlePhoto, getDailyFeaturedCar, getLeadPhoto, getWikiSummary } from '@/services/wiki';
import { useLoaded } from './useResource';

const disabled = () => Promise.reject(new Error('no title'));

export function useWikiSummary(title: string | null) {
  return useLoaded((signal) => (title ? getWikiSummary(title, signal) : disabled()), [title]);
}

export function useArticlePhoto(title: string | null) {
  return useLoaded((signal) => (title ? getArticlePhoto(title, signal) : disabled()), [title]);
}

export function useLeadPhoto(title: string | null) {
  return useLoaded((signal) => (title ? getLeadPhoto(title, signal) : disabled()), [title]);
}

export function useDailyCar() {
  const day = dayIndex();
  return useLoaded((signal) => getDailyFeaturedCar(day, signal), [day]);
}
