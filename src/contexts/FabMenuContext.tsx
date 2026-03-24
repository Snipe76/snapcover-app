'use client';

import { createContext, useContext } from 'react';

interface FabMenuContextValue {
  openFabMenu: () => void;
}

export const FabMenuContext = createContext<FabMenuContextValue>({
  openFabMenu: () => {},
});

export const useFabMenu = () => useContext(FabMenuContext);
