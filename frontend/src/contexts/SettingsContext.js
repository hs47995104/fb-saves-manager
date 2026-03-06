import React, { createContext, useState, useContext, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('fbSavesSettings');
    return savedSettings ? JSON.parse(savedSettings) : {
      showDuplicates: false,
      prioritizeBySize: true,
      highlightDuplicates: true,
      autoDetectDuplicates: true,
      duplicateMatchFields: ['url', 'title', 'name'],
      showDuplicateCount: true,
      duplicateThreshold: 0.8
    };
  });

  useEffect(() => {
    localStorage.setItem('fbSavesSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateSettings = (newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  const value = {
    settings,
    updateSetting,
    updateSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;