// Returns a Date that re-renders every `intervalMs`. Default 60s is plenty
// for a wall-clock header; drop to 1000 if you need seconds.

import { useEffect, useState } from 'react';

export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Align the first tick to the top of the next minute so the clock flips
    // at :00 instead of drifting by whatever offset the mount happened at.
    const msToNextTick = intervalMs - (Date.now() % intervalMs);
    const timeout = setTimeout(() => {
      setNow(new Date());
      const interval = setInterval(() => setNow(new Date()), intervalMs);
      // Stash the interval id on the timeout so cleanup can reach it.
      (timeout as unknown as { _int?: ReturnType<typeof setInterval> })._int = interval;
    }, msToNextTick);
    return () => {
      clearTimeout(timeout);
      const interval = (timeout as unknown as { _int?: ReturnType<typeof setInterval> })._int;
      if (interval) clearInterval(interval);
    };
  }, [intervalMs]);
  return now;
}
