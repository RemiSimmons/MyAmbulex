import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HelpContextType {
  isHelpOpen: boolean;
  currentHelpStep: string;
  openHelp: (stepId?: string) => void;
  closeHelp: () => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export const HelpProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [currentHelpStep, setCurrentHelpStep] = useState('welcome');

  const openHelp = (stepId = 'welcome') => {
    setCurrentHelpStep(stepId);
    setIsHelpOpen(true);
  };

  const closeHelp = () => {
    setIsHelpOpen(false);
  };

  return (
    <HelpContext.Provider value={{ isHelpOpen, currentHelpStep, openHelp, closeHelp }}>
      {children}
    </HelpContext.Provider>
  );
};

export const useHelp = () => {
  const context = useContext(HelpContext);
  if (context === undefined) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
};