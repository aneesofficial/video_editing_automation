import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppSettings, settingsStorage } from '../services/settingsStorage';
import { apiClient } from '../services/apiClient';
import { BackendConfig, ExportDefaults, UserProfile, WorkspacePreferences } from '../types/settings';

interface SettingsContextType {
  settings: AppSettings;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateExportDefaults: (defaults: Partial<ExportDefaults>) => void;
  updatePreferences: (prefs: Partial<WorkspacePreferences>) => void;
  updateBackendConfig: (config: Partial<BackendConfig>) => void;
  testBackendConnection: () => Promise<void>;
  isTestingConnection: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => settingsStorage.get());
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  useEffect(() => {
    apiClient.setBaseUrl(settings.backendConfig.apiUrl);
    testBackendConnection();
  }, [settings.backendConfig.apiUrl]);

  const updateProfile = (profile: Partial<UserProfile>) => {
    setSettings((prev) => {
      const updated = { ...prev, profile: { ...prev.profile, ...profile } };
      settingsStorage.save(updated);
      return updated;
    });
  };

  const updateExportDefaults = (defaults: Partial<ExportDefaults>) => {
    setSettings((prev) => {
      const updated = { ...prev, exportDefaults: { ...prev.exportDefaults, ...defaults } };
      settingsStorage.save(updated);
      return updated;
    });
  };

  const updatePreferences = (prefs: Partial<WorkspacePreferences>) => {
    setSettings((prev) => {
      const updated = { ...prev, workspacePreferences: { ...prev.workspacePreferences, ...prefs } };
      settingsStorage.save(updated);
      return updated;
    });
  };

  const updateBackendConfig = (config: Partial<BackendConfig>) => {
    setSettings((prev) => {
      const updated = { ...prev, backendConfig: { ...prev.backendConfig, ...config } };
      settingsStorage.save(updated);
      return updated;
    });
  };

  const testBackendConnection = async () => {
    setIsTestingConnection(true);
    updateBackendConfig({ status: 'checking', errorMessage: null });

    const result = await apiClient.checkHealth();

    const now = new Date().toISOString();
    if (result.connected) {
      updateBackendConfig({
        status: 'connected',
        lastCheckedAt: now,
        errorMessage: null,
      });
    } else {
      updateBackendConfig({
        status: 'disconnected',
        lastCheckedAt: now,
        errorMessage: result.message,
      });
    }

    setIsTestingConnection(false);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateProfile,
        updateExportDefaults,
        updatePreferences,
        updateBackendConfig,
        testBackendConnection,
        isTestingConnection,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
