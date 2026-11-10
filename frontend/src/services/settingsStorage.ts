import { BackendConfig, EditDefaults, ExportDefaults, UserProfile, WorkspacePreferences } from '../types/settings';

const SETTINGS_KEY = 'studio_settings_v1';
const LEGACY_KEY = 'settings_v1';

export interface AppSettings {
  profile: UserProfile;
  editDefaults: EditDefaults;
  exportDefaults: ExportDefaults;
  workspacePreferences: WorkspacePreferences;
  backendConfig: BackendConfig;
}

export const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    name: '',
    email: '',
    avatarInitials: '',
    role: '',
    workspaceName: '',
  },
  editDefaults: {
    captions: true,
    captionStyle: 'clean',
    music: false,
    musicMood: 'chill',
    logo: false,
    silenceRemoval: true,
    speechAccuracy: 'standard',
    speechLanguage: 'auto',
  },
  exportDefaults: {
    format: 'mp4',
    resolution: '1080p',
    frameRate: '30fps',
    audioBitrate: '192k',
    codec: 'h264',
    hardwareAcceleration: true,
  },
  workspacePreferences: {
    theme: 'dark-studio',
    timelineDensity: 'comfortable',
    autoSaveIntervalSeconds: 30,
    timecodeFormat: 'smpte',
    showWaveform: true,
    snapToGrid: true,
  },
  backendConfig: {
    apiUrl: 'http://localhost:3001',
    apiKey: '',
    timeoutMs: 15000,
    autoReconnect: true,
    status: 'disconnected',
    lastCheckedAt: null,
    errorMessage: null,
  },
};

export const settingsStorage = {
  get(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY) || localStorage.getItem(LEGACY_KEY);
      if (!data) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(data);
      const config = { ...DEFAULT_SETTINGS.backendConfig, ...(parsed.backendConfig || {}) };
      if (config.apiUrl === 'http://localhost:8000') {
        config.apiUrl = 'http://localhost:3001';
      }
      const profile = { ...DEFAULT_SETTINGS.profile, ...(parsed.profile || {}) };

      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        profile,
        editDefaults: { ...DEFAULT_SETTINGS.editDefaults, ...(parsed.editDefaults || {}) },
        exportDefaults: { ...DEFAULT_SETTINGS.exportDefaults, ...(parsed.exportDefaults || {}) },
        workspacePreferences: { ...DEFAULT_SETTINGS.workspacePreferences, ...(parsed.workspacePreferences || {}) },
        backendConfig: config,
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  save(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage:', e);
    }
  },

  reset(): AppSettings {
    try {
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.removeItem(LEGACY_KEY);
    } catch (e) {
      console.error('Failed to clear settings:', e);
    }
    return DEFAULT_SETTINGS;
  },
};
