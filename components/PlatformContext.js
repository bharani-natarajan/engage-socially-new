'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const PlatformContext = createContext({ platform: 'instagram', setPlatform: () => {} });

export function PlatformProvider({ children }) {
  const [platform, setPlatformState] = useState('instagram');

  useEffect(() => {
    const stored = localStorage.getItem('engage_platform');
    if (stored === 'facebook') setPlatformState('facebook');
  }, []);

  function setPlatform(p) {
    setPlatformState(p);
    localStorage.setItem('engage_platform', p);
  }

  return (
    <PlatformContext.Provider value={{ platform, setPlatform }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  return useContext(PlatformContext);
}
