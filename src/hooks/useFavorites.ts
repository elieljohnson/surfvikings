// Live favorites list, persisted per-browser via localStorage.
//
// The static DEFAULT_FAVORITES const in data.ts is the seed value any
// new visitor sees on first load. From there, edits in Settings flow
// through here and the dashboard chips re-render in step.

import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_FAVORITES } from '../lib/data';

export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<string[]>('sv:favorites', DEFAULT_FAVORITES);

  // Toggle a spot in/out of the favorites array. Stable identity via
  // useCallback so consumers can pass it down without churning props.
  const toggle = useCallback((spotId: string) => {
    setFavorites((prev) =>
      prev.includes(spotId)
        ? prev.filter((id) => id !== spotId)
        : [...prev, spotId]
    );
  }, [setFavorites]);

  const reset = useCallback(() => {
    setFavorites([...DEFAULT_FAVORITES]);
  }, [setFavorites]);

  const isFavorite = useCallback((spotId: string) => favorites.includes(spotId), [favorites]);

  return { favorites, toggle, reset, isFavorite };
}
