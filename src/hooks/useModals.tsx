import React, { createContext, useContext, useState } from 'react';

interface ModalContextType {
  isAddExpenseOpen: boolean;
  setIsAddExpenseOpen: (open: boolean) => void;
  isMonthDrawerOpen: boolean;
  setIsMonthDrawerOpen: (open: boolean) => void;
  globalMonth: string | null;
  setGlobalMonth: (month: string | null) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isMonthDrawerOpen, setIsMonthDrawerOpen] = useState(false);
  const [globalMonth, setGlobalMonth] = useState<string | null>(new Date().toISOString().slice(0, 7));

  return (
    <ModalContext.Provider 
      value={{ 
        isAddExpenseOpen, 
        setIsAddExpenseOpen, 
        isMonthDrawerOpen, 
        setIsMonthDrawerOpen,
        globalMonth,
        setGlobalMonth
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useModals() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModals must be used within a ModalProvider');
  }
  return context;
}
