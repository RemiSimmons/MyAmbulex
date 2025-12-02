import React, { createContext, ReactNode, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface RiderContextType {
  // First-time user tracking
  isFirstTimeUser: boolean;
  setHasSeenTemplateModal: (value: boolean) => void;
  
  // Ride template modal control
  isTemplateModalOpen: boolean;
  openTemplateModal: () => void;
  closeTemplateModal: () => void;
}

const RiderContext = createContext<RiderContextType | null>(null);

// Local storage keys
const SEEN_TEMPLATE_MODAL_KEY = 'myambulex_seen_template_modal';

export const RiderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // State for tracking if user is a first-time user
  const [isFirstTimeUser, setIsFirstTimeUser] = useState<boolean>(false);
  
  // State for controlling the ride templates modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  
  // Effect to check if user has seen the template modal before
  useEffect(() => {
    if (user) {
      // Check if the user has seen the template modal before using local storage
      const hasSeenTemplateModal = localStorage.getItem(SEEN_TEMPLATE_MODAL_KEY) === 'true';
      
      if (!hasSeenTemplateModal) {
        setIsFirstTimeUser(true);
        
        // Auto-open the template modal for first-time users
        setIsTemplateModalOpen(true);
        
        // Mark that the user has seen the template modal
        localStorage.setItem(SEEN_TEMPLATE_MODAL_KEY, 'true');
      }
    }
  }, [user]);
  
  // Function to open the template modal
  const openTemplateModal = () => {
    setIsTemplateModalOpen(true);
  };
  
  // Function to close the template modal
  const closeTemplateModal = () => {
    setIsTemplateModalOpen(false);
  };
  
  // Function to manually mark that a user has seen the template modal
  const setHasSeenTemplateModal = (value: boolean) => {
    localStorage.setItem(SEEN_TEMPLATE_MODAL_KEY, value ? 'true' : 'false');
    setIsFirstTimeUser(!value);
  };
  
  const value: RiderContextType = {
    isFirstTimeUser,
    setHasSeenTemplateModal,
    isTemplateModalOpen,
    openTemplateModal,
    closeTemplateModal,
  };
  
  return <RiderContext.Provider value={value}>{children}</RiderContext.Provider>;
};

export const useRider = (): RiderContextType => {
  const context = useContext(RiderContext);
  if (!context) {
    throw new Error('useRider must be used within a RiderProvider');
  }
  return context;
};