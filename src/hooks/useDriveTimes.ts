// Reads a cached drive-time matrix from localStorage and (re)fetches it
// whenever the home-base coordinates change. Components ask:
//   const driveTime = useDriveTimes();
//   driveTime(spot.id) // -> minutes (live or fallback)
//
// The matrix is keyed by the home-base coords so editing the home base
// invalidates the cache automatically. If the network call fails, callers
// keep using whatever they had before (or the spot's static fallback).

import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { driveMatrix, type HomeBase } from '../lib/routing';
import { SPOTS, type Spot } from '../lib/data';

interface MatrixCache {
  homeKey: string;          // `${lat},${lng}` rounded — used to invalidate
  minutes: Record<string, number>;
  ts: number;
}

const homeKey = (h: { lat: number; lng: number }) =>
  `${h.lat.toFixed(4)},${h.lng.toFixed(4)}`;

export function useDriveTimes(home: HomeBase | null) {
  const [cache, setCache] = useLocalStorage<MatrixCache | null>(
    'sv:driveMatrix',
    null,
  );

  // Refetch whenever the home base coords change.
  useEffect(() => {
    if (!home) return;
    const key = homeKey(home);
    if (cache?.homeKey === key && cache.minutes && Object.keys(cache.minutes).length > 0) {
      return; // Already cached for this home base.
    }
    let cancelled = false;
    const dests = SPOTS.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng }));
    driveMatrix({ lat: home.lat, lng: home.lng }, dests).then((minutes) => {
      if (cancelled || !minutes) return;
      setCache({ homeKey: key, minutes, ts: Date.now() });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home?.lat, home?.lng]);

  // Reader: returns live minutes for this home base, or the spot's static
  // fallback if we haven't computed (or couldn't compute) anything yet.
  return (spot: Spot): number => {
    if (home && cache?.homeKey === homeKey(home)) {
      const m = cache.minutes[spot.id];
      if (typeof m === 'number') return m;
    }
    return spot.driveMin;
  };
}
