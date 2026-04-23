import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { SpotDetail } from './components/SpotDetail';
import { RegionMap } from './components/RegionMap';
import { Forecast } from './components/Forecast';
import { Settings } from './components/Settings';
import { TabBar, TabId } from './components/Primitives';

type Screen = TabId | 'spot';

export function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [spotId, setSpotId] = useState<string>('bolinas-patch');

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
