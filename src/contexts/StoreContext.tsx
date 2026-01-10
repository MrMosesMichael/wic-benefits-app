/**
 * Store Context
 * Provides store detection state throughout the app
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useStoreDetection, UseStoreDetectionResult } from '../hooks/useStoreDetection';

type StoreContextType = UseStoreDetectionResult;

const StoreContext = createContext<StoreContextType | undefined>(undefined);

interface StoreProviderProps {
  children: ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const storeDetection = useStoreDetection();

  return (
    <StoreContext.Provider value={storeDetection}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
