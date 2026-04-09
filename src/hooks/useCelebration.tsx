import React, { createContext, useContext, useState, useCallback } from 'react';

export type CelebrationType = 'confetti' | 'level-up' | 'streak-shield' | 'streak-fire' | 'focus-win';

interface CelebrationContextType {
  triggerCelebration: (type: CelebrationType) => void;
  activeCelebration: CelebrationType | null;
  clearCelebration: () => void;
}

const CelebrationContext = createContext<CelebrationContextType | undefined>(undefined);

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [activeCelebration, setActiveCelebration] = useState<CelebrationType | null>(null);

  const triggerCelebration = useCallback((type: CelebrationType) => {
    setActiveCelebration(type);
    // Auto-clear after a few seconds
    setTimeout(() => {
      setActiveCelebration(null);
    }, 5000);
  }, []);

  const clearCelebration = useCallback(() => {
    setActiveCelebration(null);
  }, []);

  return (
    <CelebrationContext.Provider value={{ triggerCelebration, activeCelebration, clearCelebration }}>
      {children}
    </CelebrationContext.Provider>
  );
}

export function useCelebration() {
  const context = useContext(CelebrationContext);
  if (context === undefined) {
    throw new Error('useCelebration must be used within a CelebrationProvider');
  }
  return context;
}
