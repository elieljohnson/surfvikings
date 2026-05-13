import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { SpotDetail } from './components/SpotDetail';
import { RegionMap } from './components/RegionMap';
import { Forecast } from './components/Forecast';
import { Settings } from './components/Settings';
import { TabBar, TabId } from './components/Primitives';
import { SPOTS } from './lib/data';

type Screen = TabId | 'spot';

/** Read ?spot=<id> from the URL once on app mount. Used by the iCal
 *  forecast calendar deep links (events carry URLs of the form
 *  https://surfvikings.com/app?spot=bolinas-patch). Returns null if
 *  the param is absent or the id isn't a real spot. */
function initialSpotFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const id = new URLSearchParams(window.location.search).get('spot');
  if (!id) return null;
  return SPOTS.some((s) => s.id === id) ? id : null;
}

export function App() {
  const deepLinkSpot = initialSpotFromUrl();
  const [screen, setScreen] = useState<Screen>(deepLinkSpot ? 'spot' : 'dashboard');
  const [spotId, setSpotId] = useState<string>(deepLinkSpot ?? 'bolinas-patch');

  // Clear the ?spot= param after consuming it so a subsequent refresh
  // doesn't re-pin the user to that spot. The param's job is one-time
  // routing from a calendar tap; once we've used it, get out of the way.
  useEffect(() => {
    if (deepLinkSpot && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('spot');
      window.history.replaceState({}, '', url.toString());
    }
    // Intentionally no dependency on deepLinkSpot — we read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSpot = (id: string) => {
    setSpotId(id);
    setScreen('spot');
  };

  // Restore scroll-to-top when navigating between tab screens
  useEffect(() => {
    const root = document.getElementById('root');
    root?.scrollTo({ top: 0 });
  }, [screen]);

  return (
    <div className="pwa-shell">
      {screen === 'dashboard' && <Dashboard onOpenSpot={openSpot}/>}
      {screen === 'spot' && <SpotDetail spotId={spotId} onBack={() => setScreen('dashboard')}/>}
      {screen === 'map' && <RegionMap onOpenSpot={openSpot}/>}
      {screen === 'forecast' && <Forecast onOpenSpot={openSpot}/>}
      {screen === 'settings' && <Settings/>}
      {screen !== 'spot' && <TabBar active={screen} onChange={(id) => setScreen(id)}/>}
    </div>
  );
}
