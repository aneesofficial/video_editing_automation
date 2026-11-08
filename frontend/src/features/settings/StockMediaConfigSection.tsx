import React, { useState, useEffect } from 'react';
import { apiClient, StockStatusResponse } from '../../services/apiClient';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Globe, Key, Check, AlertCircle, RefreshCw, ExternalLink, ShieldCheck, Film, Image as ImageIcon } from 'lucide-react';

export const StockMediaConfigSection: React.FC = () => {
  const [status, setStatus] = useState<StockStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Inputs
  const [pexelsKeyInput, setPexelsKeyInput] = useState('');
  const [pixabayKeyInput, setPixabayKeyInput] = useState('');

  // Per-key testing state
  const [testingPexels, setTestingPexels] = useState(false);
  const [pexelsTestResult, setPexelsTestResult] = useState<{ valid: boolean; error?: string } | null>(null);

  const [testingPixabay, setTestingPixabay] = useState(false);
  const [pixabayTestResult, setPixabayTestResult] = useState<{ valid: boolean; error?: string } | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getStockStatus();
      setStatus(data);
    } catch (err: any) {
      console.warn('Failed to fetch stock status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestPexels = async () => {
    const key = pexelsKeyInput.trim();
    if (!key) {
      setPexelsTestResult({ valid: false, error: 'Please enter a Pexels key to test' });
      return;
    }
    setTestingPexels(true);
    setPexelsTestResult(null);
    try {
      const res = await apiClient.testStockKey('pexels', key);
      setPexelsTestResult(res);
    } catch (err: any) {
      setPexelsTestResult({ valid: false, error: err.message || 'Verification failed' });
    } finally {
      setTestingPexels(false);
    }
  };

  const handleTestPixabay = async () => {
    const key = pixabayKeyInput.trim();
    if (!key) {
      setPixabayTestResult({ valid: false, error: 'Please enter a Pixabay key to test' });
      return;
    }
    setTestingPixabay(true);
    setPixabayTestResult(null);
    try {
      const res = await apiClient.testStockKey('pixabay', key);
      setPixabayTestResult(res);
    } catch (err: any) {
      setPixabayTestResult({ valid: false, error: err.message || 'Verification failed' });
    } finally {
      setTestingPixabay(false);
    }
  };

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveFeedback(null);

    const payload: { pexelsKey?: string; pixabayKey?: string } = {};
    if (pexelsKeyInput.trim()) payload.pexelsKey = pexelsKeyInput.trim();
    if (pixabayKeyInput.trim()) payload.pixabayKey = pixabayKeyInput.trim();

    if (Object.keys(payload).length === 0) {
      setSaveFeedback({ type: 'error', message: 'No new keys provided to save.' });
      setIsSaving(false);
      return;
    }

    try {
      const res = await apiClient.saveStockKeys(payload);
      let successMsg = 'Stock API keys verified and saved safely to backend/.env.';
      if (res.pexels.error) {
        successMsg += ` (Pexels warning: ${res.pexels.error})`;
      }
      if (res.pixabay.error) {
        successMsg += ` (Pixabay warning: ${res.pixabay.error})`;
      }
      setSaveFeedback({ type: 'success', message: successMsg });
      setPexelsKeyInput('');
      setPixabayKeyInput('');
      await fetchStatus();
    } catch (err: any) {
      setSaveFeedback({ type: 'error', message: err.message || 'Failed to save stock API keys' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="p-6 bg-studio-surface border border-studio-border rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Stock Media & Auto B-Roll Providers</h3>
              <p className="text-xs text-studio-muted mt-0.5">
                Search millions of free stock videos and photos directly from Pexels and Pixabay, or let AI automatically add B-roll.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={isLoading}
            className="flex items-center gap-1.5 self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 p-3 bg-studio-card/60 border border-studio-border/60 rounded-lg text-xs text-studio-muted">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            API keys are saved safely in your workstation's <code className="text-emerald-400">backend/.env</code>. Keys are never saved in the browser, never displayed unmasked, and never logged.
          </span>
        </div>
      </div>

      <form onSubmit={handleSaveKeys} className="space-y-6">
        {/* Pexels Configuration Card */}
        <div className="p-6 bg-studio-surface border border-studio-border rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-semibold text-white">Pexels API</h4>
              <span className="text-xs text-studio-muted">(HD Videos & Photos)</span>
            </div>
            {status?.pexels.configured ? (
              <Badge variant="emerald" className="text-xs py-0.5 px-2">
                Configured ({status.pexels.maskedKey})
              </Badge>
            ) : (
              <Badge variant="neutral" className="text-xs py-0.5 px-2 text-studio-muted">
                Not Configured
              </Badge>
            )}
          </div>

          <p className="text-xs text-studio-muted leading-relaxed">
            Free tier includes 200 requests/hour. Ideal for high-definition b-roll footage and cinematic photography.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-medium text-studio-text block">
              Pexels API Key
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Key className="w-4 h-4 text-studio-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  value={pexelsKeyInput}
                  onChange={(e) => setPexelsKeyInput(e.target.value)}
                  placeholder={status?.pexels.maskedKey || 'Paste your Pexels API key here...'}
                  className="w-full pl-9 pr-3 py-2 bg-studio-card border border-studio-border rounded-lg text-xs text-white placeholder-studio-muted/50 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestPexels}
                disabled={testingPexels || !pexelsKeyInput.trim()}
                className="shrink-0"
              >
                {testingPexels ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                )}
                Test Key
              </Button>
            </div>
          </div>

          {pexelsTestResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                pexelsTestResult.valid
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              {pexelsTestResult.valid ? (
                <>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Key is valid! Click "Save Stock Keys" below to persist it.</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pexelsTestResult.error || 'Pexels key validation failed.'}</span>
                </>
              )}
            </div>
          )}

          <div className="pt-2 flex items-center justify-between text-xs border-t border-studio-border/60">
            <span className="text-studio-muted">Need a free Pexels key?</span>
            <a
              href="https://www.pexels.com/api/"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 transition-colors"
            >
              <span>Get free Pexels key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Pixabay Configuration Card */}
        <div className="p-6 bg-studio-surface border border-studio-border rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-semibold text-white">Pixabay API</h4>
              <span className="text-xs text-studio-muted">(4K & HD Videos & Photos)</span>
            </div>
            {status?.pixabay.configured ? (
              <Badge variant="emerald" className="text-xs py-0.5 px-2">
                Configured ({status.pixabay.maskedKey})
              </Badge>
            ) : (
              <Badge variant="neutral" className="text-xs py-0.5 px-2 text-studio-muted">
                Not Configured
              </Badge>
            )}
          </div>

          <p className="text-xs text-studio-muted leading-relaxed">
            Free tier includes 100 requests/minute. Broad selection of video clips, drone shots, and stock imagery.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-medium text-studio-text block">
              Pixabay API Key
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Key className="w-4 h-4 text-studio-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  value={pixabayKeyInput}
                  onChange={(e) => setPixabayKeyInput(e.target.value)}
                  placeholder={status?.pixabay.maskedKey || 'Paste your Pixabay API key here...'}
                  className="w-full pl-9 pr-3 py-2 bg-studio-card border border-studio-border rounded-lg text-xs text-white placeholder-studio-muted/50 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestPixabay}
                disabled={testingPixabay || !pixabayKeyInput.trim()}
                className="shrink-0"
              >
                {testingPixabay ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                )}
                Test Key
              </Button>
            </div>
          </div>

          {pixabayTestResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                pixabayTestResult.valid
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              {pixabayTestResult.valid ? (
                <>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Key is valid! Click "Save Stock Keys" below to persist it.</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pixabayTestResult.error || 'Pixabay key validation failed.'}</span>
                </>
              )}
            </div>
          )}

          <div className="pt-2 flex items-center justify-between text-xs border-t border-studio-border/60">
            <span className="text-studio-muted">Need a free Pixabay key?</span>
            <a
              href="https://pixabay.com/api/docs/"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 transition-colors"
            >
              <span>Get free Pixabay key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Feedback message */}
        {saveFeedback && (
          <div
            className={`p-3.5 rounded-lg text-xs flex items-start gap-2.5 border ${
              saveFeedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {saveFeedback.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{saveFeedback.message}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSaving || (!pexelsKeyInput.trim() && !pixabayKeyInput.trim())}
            className="flex items-center gap-2"
          >
            {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>Save Stock Keys</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
