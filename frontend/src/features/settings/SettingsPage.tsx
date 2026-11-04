import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Sliders, Film, Server } from 'lucide-react';
import { ProfileSettingsForm } from './ProfileSettingsForm';
import { ExportSettingsForm } from './ExportSettingsForm';
import { BackendConfigSection } from './BackendConfigSection';
import { useSettings } from '../../store/SettingsContext';

type SettingsTab = 'profile' | 'appearance' | 'export' | 'backend';

export const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as SettingsTab) || 'profile';

  const { settings, updatePreferences } = useSettings();

  const setTab = (tab: SettingsTab) => {
    setSearchParams({ tab });
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="border-b border-studio-border pb-6">
        <h2 className="text-2xl font-bold tracking-tight text-white">Settings & Preferences</h2>
        <p className="text-xs text-studio-muted mt-1">
          Manage local workstation preferences, video encoding presets, and AI compute connectivity.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-studio-border pb-px overflow-x-auto">
        <button
          onClick={() => setTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
            activeTab === 'profile'
              ? 'border-violet-500 text-white bg-studio-surface'
              : 'border-transparent text-studio-muted hover:text-studio-text'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile & Workspace</span>
        </button>

        <button
          onClick={() => setTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
            activeTab === 'appearance'
              ? 'border-violet-500 text-white bg-studio-surface'
              : 'border-transparent text-studio-muted hover:text-studio-text'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Timeline & UI</span>
        </button>

        <button
          onClick={() => setTab('export')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
            activeTab === 'export'
              ? 'border-violet-500 text-white bg-studio-surface'
              : 'border-transparent text-studio-muted hover:text-studio-text'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Video & Export Presets</span>
        </button>

        <button
          onClick={() => setTab('backend')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
            activeTab === 'backend'
              ? 'border-violet-500 text-white bg-studio-surface'
              : 'border-transparent text-studio-muted hover:text-studio-text'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>AI Engine Backend</span>
          <span
            className={`w-2 h-2 rounded-full ${
              settings.backendConfig.status === 'connected' ? 'bg-emerald-400' : 'bg-studio-subtle'
            }`}
          />
        </button>
      </div>

      {/* Tab 1: Profile */}
      {activeTab === 'profile' && (
        <div className="bg-studio-surface border border-studio-border rounded-xl p-6 space-y-6">
          <div className="pb-4 border-b border-studio-border">
            <h3 className="text-sm font-semibold text-studio-text">Local Studio Profile</h3>
            <p className="text-xs text-studio-muted">
              Configure personal credentials and production role information saved locally.
            </p>
          </div>
          <ProfileSettingsForm />
        </div>
      )}

      {/* Tab 2: Appearance & Timeline */}
      {activeTab === 'appearance' && (
        <div className="bg-studio-surface border border-studio-border rounded-xl p-6 space-y-6">
          <div className="pb-4 border-b border-studio-border">
            <h3 className="text-sm font-semibold text-studio-text">Timeline & Interface Preferences</h3>
            <p className="text-xs text-studio-muted">
              Configure timeline density, timecode display standard, and canvas snapping.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-studio-muted">Theme</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updatePreferences({ theme: 'dark-studio' })}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    settings.workspacePreferences.theme === 'dark-studio'
                      ? 'bg-violet-600/15 border-violet-500 text-white'
                      : 'bg-studio-card border-studio-border text-studio-muted'
                  }`}
                >
                  Dark Creative Studio
                </button>

                <button
                  type="button"
                  onClick={() => updatePreferences({ theme: 'high-contrast-dark' })}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    settings.workspacePreferences.theme === 'high-contrast-dark'
                      ? 'bg-violet-600/15 border-violet-500 text-white'
                      : 'bg-studio-card border-studio-border text-studio-muted'
                  }`}
                >
                  High Contrast Studio
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-studio-muted">Timeline Track Density</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updatePreferences({ timelineDensity: 'comfortable' })}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    settings.workspacePreferences.timelineDensity === 'comfortable'
                      ? 'bg-violet-600/15 border-violet-500 text-white'
                      : 'bg-studio-card border-studio-border text-studio-muted'
                  }`}
                >
                  Comfortable (48px)
                </button>

                <button
                  type="button"
                  onClick={() => updatePreferences({ timelineDensity: 'compact' })}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    settings.workspacePreferences.timelineDensity === 'compact'
                      ? 'bg-violet-600/15 border-violet-500 text-white'
                      : 'bg-studio-card border-studio-border text-studio-muted'
                  }`}
                >
                  Compact (36px)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-studio-muted">Timecode Standard</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updatePreferences({ timecodeFormat: 'smpte' })}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    settings.workspacePreferences.timecodeFormat === 'smpte'
                      ? 'bg-violet-600/15 border-violet-500 text-white'
                      : 'bg-studio-card border-studio-border text-studio-muted'
                  }`}
                >
                  SMPTE (00:00:00:00)
                </button>

                <button
                  type="button"
                  onClick={() => updatePreferences({ timecodeFormat: 'seconds' })}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    settings.workspacePreferences.timecodeFormat === 'seconds'
                      ? 'bg-violet-600/15 border-violet-500 text-white'
                      : 'bg-studio-card border-studio-border text-studio-muted'
                  }`}
                >
                  Decimal Seconds
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.workspacePreferences.showWaveform}
                  onChange={(e) => updatePreferences({ showWaveform: e.target.checked })}
                  className="w-4 h-4 rounded text-violet-600 bg-studio-surface border-studio-border"
                />
                <span className="text-xs text-studio-text">Render audio waveform silhouettes on timeline clips</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.workspacePreferences.snapToGrid}
                  onChange={(e) => updatePreferences({ snapToGrid: e.target.checked })}
                  className="w-4 h-4 rounded text-violet-600 bg-studio-surface border-studio-border"
                />
                <span className="text-xs text-studio-text">Snap playhead to clip cuts and second markers</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Export Presets */}
      {activeTab === 'export' && (
        <div className="bg-studio-surface border border-studio-border rounded-xl p-6 space-y-6">
          <div className="pb-4 border-b border-studio-border">
            <h3 className="text-sm font-semibold text-studio-text">Default Video Export Preferences</h3>
            <p className="text-xs text-studio-muted">
              Configure standard transcode and container defaults.
            </p>
          </div>
          <ExportSettingsForm />
        </div>
      )}

      {/* Tab 4: Backend Config */}
      {activeTab === 'backend' && (
        <div className="bg-studio-surface border border-studio-border rounded-xl p-6 space-y-6">
          <div className="pb-4 border-b border-studio-border">
            <h3 className="text-sm font-semibold text-studio-text">AI Compute Backend Configuration</h3>
            <p className="text-xs text-studio-muted">
              Configure communication endpoints for future Phase 2 automated video rendering pipelines.
            </p>
          </div>
          <BackendConfigSection />
        </div>
      )}
    </div>
  );
};
