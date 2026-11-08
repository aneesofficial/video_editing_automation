import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { backendConfigSchema, BackendConfigValues } from './settingsSchemas';
import { useSettings } from '../../store/SettingsContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatters';
import { RefreshCw, Check, Sparkles, Key, AlertCircle, Eye, ShieldAlert, Mic } from 'lucide-react';
import { apiClient, AIStatusResponse } from '../../services/apiClient';

export const BackendConfigSection: React.FC = () => {
  const { settings, updateBackendConfig, testBackendConnection, isTestingConnection } = useSettings();
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Gemini AI State
  const [aiStatus, setAiStatus] = useState<AIStatusResponse | null>(null);
  const [isLoadingAiStatus, setIsLoadingAiStatus] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyFeedback, setKeyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isTogglingVision, setIsTogglingVision] = useState(false);

  // Whisper Local Transcription State
  const [whisperModel, setWhisperModel] = useState<string>('base');
  const [whisperLanguage, setWhisperLanguage] = useState<string>('auto');
  const [isUpdatingWhisper, setIsUpdatingWhisper] = useState(false);
  const [whisperFeedback, setWhisperFeedback] = useState<string | null>(null);

  const fetchAiStatus = async () => {
    setIsLoadingAiStatus(true);
    try {
      const status = await apiClient.getAiStatus();
      setAiStatus(status);
      if (status.whisperModel) setWhisperModel(status.whisperModel);
      if (status.whisperLanguage) setWhisperLanguage(status.whisperLanguage);
    } catch (err: any) {
      setAiStatus({
        online: false,
        model: 'gemini-3.5-flash',
        hasKey: false,
        maskedKey: null,
        visionEnabled: false,
        reason: 'Could not connect to backend to query Gemini status.',
      });
    } finally {
      setIsLoadingAiStatus(false);
    }
  };

  useEffect(() => {
    fetchAiStatus();
  }, []);

  const handleTestAndSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const keyToTest = inputKey.trim();
    if (!keyToTest) {
      setKeyFeedback({ type: 'error', message: 'Please enter a valid Gemini API key.' });
      return;
    }

    setIsTestingKey(true);
    setKeyFeedback(null);
    try {
      const result = await apiClient.saveAiKey(keyToTest);
      setKeyFeedback({
        type: 'success',
        message: 'Gemini API key verified and saved to backend/.env! AI engine is now Online.',
      });
      setInputKey(''); // Clear raw key from DOM and browser state
      await fetchAiStatus();
    } catch (err: any) {
      setKeyFeedback({
        type: 'error',
        message: err?.message || 'Failed to verify Gemini API key with Google.',
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleToggleVision = async (enabled: boolean) => {
    setIsTogglingVision(true);
    try {
      await apiClient.updateAiSettings(enabled);
      setAiStatus((prev) => (prev ? { ...prev, visionEnabled: enabled } : null));
    } catch (err: any) {
      alert('Failed to update vision setting: ' + err.message);
    } finally {
      setIsTogglingVision(false);
    }
  };

  const handleUpdateWhisper = async (newModel: string, newLang: string) => {
    setWhisperModel(newModel);
    setWhisperLanguage(newLang);
    setIsUpdatingWhisper(true);
    setWhisperFeedback(null);
    try {
      const updated = await apiClient.updateAiSettings({
        whisperModel: newModel,
        whisperLanguage: newLang,
      });
      setAiStatus(updated);
      setWhisperFeedback('Settings saved to backend/.env');
      setTimeout(() => setWhisperFeedback(null), 2500);
    } catch (err: any) {
      alert('Failed to update Whisper settings: ' + err.message);
    } finally {
      setIsUpdatingWhisper(false);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BackendConfigValues>({
    resolver: zodResolver(backendConfigSchema),
    defaultValues: {
      apiUrl: settings.backendConfig.apiUrl,
      apiKey: settings.backendConfig.apiKey,
    },
  });

  const onSubmit = (data: BackendConfigValues) => {
    updateBackendConfig(data);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const status = settings.backendConfig.status;

  return (
    <div className="space-y-8">
      {/* Gemini AI Card */}
      <div className="bg-studio-surface border border-studio-border rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-studio-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-white">Google Gemini AI Engine</h3>
              {isLoadingAiStatus ? (
                <Badge variant="amber" size="sm" dot>Checking...</Badge>
              ) : aiStatus?.online ? (
                <Badge variant="emerald" size="sm" dot>Online ({aiStatus.model})</Badge>
              ) : (
                <Badge variant="rose" size="sm" dot>Offline</Badge>
              )}
            </div>
            <p className="text-xs text-studio-muted">
              Official Google Gemini Flash API powers autonomous scene selection, silence removal, and cut sequencing.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAiStatus}
            disabled={isLoadingAiStatus}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingAiStatus ? 'animate-spin' : ''}`} />}
          >
            Refresh Status
          </Button>
        </div>

        {/* Offline Reason banner */}
        {aiStatus && !aiStatus.online && aiStatus.reason && (
          <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-200 block">AI Engine Offline</span>
              <span>{aiStatus.reason}</span>
            </div>
          </div>
        )}

        {/* Active Key Status */}
        <div className="bg-studio-card border border-studio-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Key className="w-4 h-4 text-violet-400" />
            <div>
              <span className="text-xs font-semibold text-studio-text block">Configured API Key</span>
              <span className="text-xs font-mono text-studio-muted">
                {aiStatus?.hasKey && aiStatus?.maskedKey ? (
                  <span className="text-emerald-400 font-bold">{aiStatus.maskedKey}</span>
                ) : (
                  <span className="text-amber-400">No key configured in backend/.env</span>
                )}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-studio-subtle font-mono">
            Model: {aiStatus?.model || 'gemini-3.5-flash'}
          </span>
        </div>

        {/* Key Input Form */}
        <form onSubmit={handleTestAndSaveKey} className="space-y-3">
          <label className="block text-xs font-semibold text-studio-text">
            Update Gemini API Key
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Paste Google Gemini API Key (e.g. AQ.Ab8...)"
              className="flex-1 bg-studio-bg border border-studio-border rounded-lg px-3 py-2 text-xs text-white placeholder-studio-subtle focus:outline-none focus:border-violet-500 font-mono"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isTestingKey}
              disabled={isTestingKey || !inputKey.trim()}
              leftIcon={<Key className="w-3.5 h-3.5" />}
            >
              Test & Save Key
            </Button>
          </div>
          <p className="text-[11px] text-studio-subtle">
            The key is tested with Google and saved to backend/.env as GEMINI_API_KEY. It is never stored in browser localStorage or logged.
          </p>

          {keyFeedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                keyFeedback.type === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
              }`}
            >
              {keyFeedback.type === 'success' ? (
                <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              )}
              <span>{keyFeedback.message}</span>
            </div>
          )}
        </form>

        {/* Vision Frames Switch */}
        <div className="pt-4 border-t border-studio-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="vision-toggle" className="text-xs font-semibold text-studio-text cursor-pointer flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-violet-400" />
                Let AI see small preview frames
              </label>
              <p className="text-[11px] text-studio-muted">
                Extracts lightweight keyframes to help Gemini analyze visual scene composition.
              </p>
            </div>
            <input
              id="vision-toggle"
              type="checkbox"
              checked={aiStatus?.visionEnabled || false}
              onChange={(e) => handleToggleVision(e.target.checked)}
              disabled={isTogglingVision}
              className="w-4 h-4 rounded border-studio-border bg-studio-bg text-violet-600 focus:ring-violet-500 cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-start gap-2.5 text-amber-300 text-xs">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-200">Privacy Notice: </span>
              Frames are sent to Google. Keep this OFF for private client videos.
            </div>
          </div>
        </div>

        {/* Step 5B Feature: Local faster-whisper Speech-to-Text Settings */}
        <div className="pt-4 border-t border-studio-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-studio-text flex items-center gap-2">
                <Mic className="w-3.5 h-3.5 text-violet-400" />
                Local Speech Recognition (faster-whisper)
              </span>
              <p className="text-[11px] text-studio-muted">
                Generates word-level timestamps locally without cloud limits or external API charges.
              </p>
            </div>
            {whisperFeedback && (
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" />
                {whisperFeedback}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-studio-subtle">Model Size</label>
              <select
                value={whisperModel}
                disabled={isUpdatingWhisper}
                onChange={(e) => handleUpdateWhisper(e.target.value, whisperLanguage)}
                className="w-full bg-studio-bg border border-studio-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 font-mono cursor-pointer"
              >
                <option value="tiny">tiny (fastest, lowest accuracy)</option>
                <option value="base">base (default, recommended)</option>
                <option value="small">small (higher accuracy, slower)</option>
                <option value="medium">medium (highest accuracy, slowest)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-studio-subtle">Language Recognition</label>
              <select
                value={whisperLanguage}
                disabled={isUpdatingWhisper}
                onChange={(e) => handleUpdateWhisper(whisperModel, e.target.value)}
                className="w-full bg-studio-bg border border-studio-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 font-mono cursor-pointer"
              >
                <option value="auto">Auto Detect Language</option>
                <option value="en">English (en)</option>
                <option value="ur">Urdu (اردو - ur)</option>
                <option value="hi">Hindi (हिन्दी - hi)</option>
                <option value="ar">Arabic (العربية - ar)</option>
              </select>
            </div>
          </div>

          <p className="text-[11px] text-studio-subtle leading-relaxed bg-studio-bg/60 p-2.5 rounded-lg border border-studio-border/50">
            💡 <strong className="text-studio-text">Accuracy Tip:</strong> Bigger models (small/medium) are more accurate for noisy audio and accents, but require more CPU power. <strong>base</strong> offers the best balance of speed and accuracy.
          </p>
        </div>
      </div>

      {/* Engine Endpoint Status */}
      <div className="bg-studio-surface border border-studio-border rounded-xl p-6 space-y-6">
        <div className="pb-4 border-b border-studio-border">
          <h3 className="text-sm font-semibold text-white">Local Server Connectivity</h3>
          <p className="text-xs text-studio-muted">
            Configure host endpoint exposing the backend API server.
          </p>
        </div>

        <div className="p-4 bg-studio-card border border-studio-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-studio-text">Engine Endpoint Connectivity:</span>
              {status === 'connected' ? (
                <Badge variant="emerald" size="sm" dot>Connected</Badge>
              ) : status === 'checking' ? (
                <Badge variant="amber" size="sm" dot>Testing...</Badge>
              ) : (
                <Badge variant="neutral" size="sm" dot>Offline (Phase 2)</Badge>
              )}
            </div>
            <p className="text-xs text-studio-muted">
              {status === 'connected'
                ? 'Local video editing backend is online and communicating with NovaCut Studio.'
                : settings.backendConfig.errorMessage
                ? settings.backendConfig.errorMessage
                : 'Backend is offline or awaiting launch. Local editing and timeline preview operate offline.'}
            </p>
            {settings.backendConfig.lastCheckedAt && (
              <span className="text-[10px] font-mono text-studio-subtle block">
                Last probe: {formatDate(settings.backendConfig.lastCheckedAt)}
              </span>
            )}
          </div>

          <Button
            variant="primary"
            size="sm"
            isLoading={isTestingConnection}
            onClick={testBackendConnection}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />}
          >
            Test Connection
          </Button>
        </div>

        {/* Config Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Backend API Base URL"
            {...register('apiUrl')}
            error={errors.apiUrl?.message}
            helperText="Host endpoint exposing the backend video editing service (default: http://localhost:3001)."
          />

          <Input
            label="API Authentication Token (Optional)"
            type="password"
            {...register('apiKey')}
            error={errors.apiKey?.message}
            placeholder="novacut_live_****************"
            helperText="Bearer token for private GPU rendering clusters."
          />

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              leftIcon={saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : undefined}
            >
              {saveSuccess ? 'Endpoint Saved' : 'Save Endpoint'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
