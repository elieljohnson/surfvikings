// Tiny localStorage-backed state hook. Survives reloads, no backend required.
// Safe for SSR / missing storage (falls back to in-memory initial value).

import { useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Private mode, quota, etc. — silently ignore.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
