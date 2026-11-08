import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Database,
  Cpu,
  Terminal,
  Volume2,
  Image as ImageIcon,
  Sparkles,
  Globe,
  Trash2,
  Archive,
  Check,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Folder,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  apiClient,
  SystemHealthReport,
  StorageOverviewReport,
  BackupResult,
} from '../../services/apiClient';

export const SystemStorageSection: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [storage, setStorage] = useState<StorageOverviewReport | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);

  // Cache cleaning state
  const [isCleaningCache, setIsCleaningCache] = useState(false);
  const [cleanResult, setCleanResult] = useState<{ freedMb: number; cleanedFilesCount: number } | null>(null);
  const [cleanError, setCleanError] = useState<string | null>(null);

  // Backup state
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const data = await apiClient.getSystemHealth();
      setHealth(data);
    } catch (err: any) {
      console.error('Failed to load system health:', err);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const fetchStorage = async () => {
    setIsLoadingStorage(true);
    try {
      const data = await apiClient.getStorageOverview();
      setStorage(data);
    } catch (err: any) {
      console.error('Failed to load storage info:', err);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchStorage();
  }, []);

  const handleCleanCache = async () => {
    if (!window.confirm('Clean preview cache and temporary files? Raw footage and finished exports will NEVER be touched.')) {
      return;
    }
    setIsCleaningCache(true);
    setCleanError(null);
    setCleanResult(null);
    try {
      const res = await apiClient.cleanCache();
      setCleanResult(res);
      await fetchStorage();
    } catch (err: any) {
      setCleanError(err.message || 'Failed to clean cache');
    } finally {
      setIsCleaningCache(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    setBackupError(null);
    setBackupResult(null);
    try {
      const res = await apiClient.createBackup();
      setBackupResult(res);
    } catch (err: any) {
      setBackupError(err.message || 'Failed to create backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. System Health & Diagnostic Check Card */}
      <div className="bg-studio-surface border border-studio-border rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-studio-border">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">System Diagnostics & Health Check</h3>
              {health && (
                <Badge
                  variant={health.status === 'healthy' ? 'emerald' : 'amber'}
                  size="sm"
                >
                  {health.status === 'healthy' ? 'All Systems Healthy' : 'Degraded Components'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-studio-muted mt-1">
              Verifies local binaries (FFmpeg, Python), SQLite database, AI models, and API connectivity.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={fetchHealth}
            disabled={isLoadingHealth}
            className="flex items-center gap-1.5 self-start sm:self-auto text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHealth ? 'animate-spin' : ''}`} />
            <span>{isLoadingHealth ? 'Checking...' : 'Run System Check'}</span>
          </Button>
        </div>

        {health ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Database */}
            <div className="p-3 rounded-lg bg-studio-card border border-studio-border flex items-start gap-3">
              <div className="p-2 rounded-md bg-violet-500/10 text-violet-400 mt-0.5">
                <Database className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">SQLite Database</span>
                  <Badge variant={health.database.status === 'ok' ? 'emerald' : 'rose'} size="sm">
                    {health.database.status === 'ok' ? 'Connected' : 'Error'}
                  </Badge>
                </div>
                <p className="text-[11px] text-studio-muted truncate mt-0.5">{health.database.message}</p>
              </div>
            </div>

            {/* FFmpeg */}
            <div className="p-3 rounded-lg bg-studio-card border border-studio-border flex items-start gap-3">
              <div className="p-2 rounded-md bg-cyan-500/10 text-cyan-400 mt-0.5">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">FFmpeg Engine</span>
                  <Badge variant={health.ffmpeg.status === 'ok' ? 'emerald' : 'rose'} size="sm">
                    {health.ffmpeg.status === 'ok' ? 'Ready' : 'Error'}
                  </Badge>
                </div>
                <p className="text-[11px] text-studio-muted truncate mt-0.5" title={health.ffmpeg.version}>
                  {health.ffmpeg.version || health.ffmpeg.message}
                </p>
              </div>
            </div>

            {/* Python Worker */}
            <div className="p-3 rounded-lg bg-studio-card border border-studio-border flex items-start gap-3">
              <div className="p-2 rounded-md bg-amber-500/10 text-amber-400 mt-0.5">
                <Terminal className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Python 3 Runtime</span>
                  <Badge variant={health.python.status === 'ok' ? 'emerald' : 'rose'} size="sm">
                    {health.python.status === 'ok' ? 'Ready' : 'Error'}
                  </Badge>
                </div>
                <p className="text-[11px] text-studio-muted truncate mt-0.5">{health.python.version || 'Operational'}</p>
              </div>
            </div>

            {/* Whisper AI Subtitles */}
            <div className="p-3 rounded-lg bg-studio-card border border-studio-border flex items-start gap-3">
              <div className="p-2 rounded-md bg-blue-500/10 text-blue-400 mt-0.5">
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Whisper Subtitles</span>
                  <Badge variant="emerald" size="sm">Active</Badge>
                </div>
                <p className="text-[11px] text-studio-muted truncate mt-0.5">Model: {health.whisper.model} (Word Timestamps)</p>
              </div>
            </div>

            {/* ONNX Background Remover */}
            <div className="p-3 rounded-lg bg-studio-card border border-studio-border flex items-start gap-3">
              <div className="p-2 rounded-md bg-rose-500/10 text-rose-400 mt-0.5">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">ONNX Photo AI</span>
                  <Badge variant={health.onnx.exists ? 'emerald' : 'neutral'} size="sm">
                    {health.onnx.exists ? 'Ready' : 'Not Found'}
                  </Badge>
                </div>
                <p className="text-[11px] text-studio-muted truncate mt-0.5">
                  {health.onnx.exists ? `u2netp.onnx (${health.onnx.sizeMb} MB)` : 'Optional u2netp model'}
                </p>
              </div>
            </div>

            {/* Gemini AI Planner */}
            <div className="p-3 rounded-lg bg-studio-card border border-studio-border flex items-start gap-3">
              <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-400 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Gemini Planner</span>
                  <Badge variant={health.gemini.hasKey ? 'emerald' : 'rose'} size="sm">
                    {health.gemini.hasKey ? 'Configured' : 'Missing'}
                  </Badge>
                </div>
                <p className="text-[11px] text-studio-muted truncate mt-0.5">
                  {health.gemini.hasKey ? `${health.gemini.model} (${health.gemini.maskedKey})` : 'Key required'}
                </p>
              </div>
            </div>

            {/* Pixabay Stock Provider */}
            <div className="p-3 rounded-lg bg-studio-card border border-studio-border flex items-start gap-3">
              <div className="p-2 rounded-md bg-teal-500/10 text-teal-400 mt-0.5">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Pixabay Stock</span>
                  <Badge variant={health.stock.pixabay.hasKey ? 'emerald' : 'neutral'} size="sm">
                    {health.stock.pixabay.hasKey ? 'Online' : 'Not Set'}
                  </Badge>
                </div>
                <p className="text-[11px] text-studio-muted truncate mt-0.5">
                  {health.stock.pixabay.hasKey ? `Key: ${health.stock.pixabay.maskedKey}` : 'Optional provider'}
                </p>
              </div>
            </div>

            {/* Pexels Stock Provider */}
            <div className="p-3 rounded-lg bg-studio-card border border-studio-border flex items-start gap-3">
              <div className="p-2 rounded-md bg-indigo-500/10 text-indigo-400 mt-0.5">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Pexels Stock</span>
                  <Badge variant={health.stock.pexels.hasKey ? 'emerald' : 'neutral'} size="sm">
                    {health.stock.pexels.hasKey ? 'Online' : 'Not Set'}
                  </Badge>
                </div>
                <p className="text-[11px] text-studio-muted truncate mt-0.5">
                  {health.stock.pexels.hasKey ? `Key: ${health.stock.pexels.maskedKey}` : 'Keys paused by Pexels'}
                </p>
              </div>
            </div>

            {/* Music Library */}
            <div className="p-3 rounded-lg bg-studio-card border border-studio-border flex items-start gap-3">
              <div className="p-2 rounded-md bg-fuchsia-500/10 text-fuchsia-400 mt-0.5">
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Music Tracks</span>
                  <Badge variant="emerald" size="sm">{health.musicLibrary.trackCount} Tracks</Badge>
                </div>
                <p className="text-[11px] text-studio-muted truncate mt-0.5">Stored in backend/storage/music-library</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-studio-muted">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-violet-400" />
            Loading system diagnostic checks...
          </div>
        )}
      </div>

      {/* 2. Storage Usage & Cache Cleaning Card */}
      <div className="bg-studio-surface border border-studio-border rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-studio-border">
          <div>
            <h3 className="text-sm font-semibold text-white">Storage Usage & Cache Cleanup</h3>
            <p className="text-xs text-studio-muted mt-1">
              Monitors disk space, per-client workspace usage, and provides 1-click preview cache cleanup.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={fetchStorage}
            disabled={isLoadingStorage}
            className="flex items-center gap-1.5 self-start sm:self-auto text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStorage ? 'animate-spin' : ''}`} />
            <span>Refresh Storage</span>
          </Button>
        </div>

        {/* Low Disk Warning if < 10GB */}
        {storage?.disk.warning && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">Low Free Disk Space Warning</h4>
              <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                Your primary storage drive has only <strong>{storage.disk.freeGb} GB</strong> remaining (less than 10 GB).
                Video rendering requires temporary scratch space. Please clean preview caches or free disk space.
              </p>
            </div>
          </div>
        )}

        {storage && (
          <div className="space-y-5">
            {/* Storage Drive Bar */}
            <div className="p-4 rounded-xl bg-studio-card border border-studio-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-violet-400" />
                  Primary Storage Drive
                </span>
                <span className="text-studio-muted font-mono">
                  {storage.disk.freeGb} GB free of {storage.disk.totalGb} GB
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-studio-surface overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    storage.disk.warning ? 'bg-amber-500' : 'bg-violet-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(5, ((storage.disk.totalGb - storage.disk.freeGb) / (storage.disk.totalGb || 1)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Clients Storage Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-studio-text uppercase tracking-wider">Usage Per Client</h4>
              <div className="border border-studio-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-studio-card text-studio-muted border-b border-studio-border">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Client Name</th>
                      <th className="py-2.5 px-4 font-medium text-center">Projects</th>
                      <th className="py-2.5 px-4 font-medium text-right">Disk Space</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-studio-border text-white">
                    {storage.clients.map((c) => (
                      <tr key={c.name} className="hover:bg-studio-card/50 transition-colors">
                        <td className="py-2.5 px-4 font-medium flex items-center gap-2">
                          <Folder className="w-3.5 h-3.5 text-violet-400" />
                          <span>{c.name}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center text-studio-muted">{c.projectCount}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-studio-muted">
                          {c.totalSizeMb > 1024
                            ? `${(c.totalSizeMb / 1024).toFixed(2)} GB`
                            : `${c.totalSizeMb.toFixed(1)} MB`}
                        </td>
                      </tr>
                    ))}
                    {storage.clients.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-studio-muted">
                          No client project folders found yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cache Cleaning Action Card */}
            <div className="p-4 rounded-xl bg-studio-card border border-studio-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold text-white">Clean Preview & Scratch Cache</span>
                  <Badge variant="neutral" size="sm">
                    {storage.cacheCleanableMb} MB cleanable
                  </Badge>
                </div>
                <p className="text-[11px] text-studio-muted leading-relaxed">
                  Safely deletes temporary render scratch files and low-resolution preview images.
                  <br />
                  <span className="text-emerald-400 font-medium">Strict guarantee:</span> raw user footage and finished export MP4s are <strong>never</strong> touched.
                </p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleCleanCache}
                disabled={isCleaningCache || storage.cacheCleanableMb === 0}
                className="flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto text-xs border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
              >
                {isCleaningCache ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cleaning...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clean Cache Now</span>
                  </>
                )}
              </Button>
            </div>

            {cleanResult && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  Successfully cleaned <strong>{cleanResult.cleanedFilesCount} files</strong>, freeing{' '}
                  <strong>{cleanResult.freedMb} MB</strong> of disk space!
                </span>
              </div>
            )}

            {cleanError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{cleanError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Safe Workspace Backup Card */}
      <div className="bg-studio-surface border border-studio-border rounded-xl p-6 space-y-5">
        <div className="pb-4 border-b border-studio-border">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-white">Workspace & Project Metadata Backup</h3>
          </div>
          <p className="text-xs text-studio-muted mt-1 leading-relaxed">
            Archives your entire project database (<code className="text-violet-300 font-mono text-[11px]">dev.db</code>),
            all client metadata (<code className="text-violet-300 font-mono text-[11px]">project.json</code>), and all AI editing plans
            (<code className="text-violet-300 font-mono text-[11px]">plan_v*.json</code>) into a compressed ZIP file stored in{' '}
            <code className="text-violet-300 font-mono text-[11px]">backend/backups/</code> with a precise timestamp.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-studio-card border border-studio-border">
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-white">Create Instant Timestamped Backup</h4>
            <p className="text-[11px] text-studio-muted">
              Fast, lightweight zip archive. Safe to copy to external drives or cloud storage.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateBackup}
            disabled={isBackingUp}
            className="flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto text-xs"
          >
            {isBackingUp ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Creating Backup ZIP...</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5" />
                <span>Create Backup</span>
              </>
            )}
          </Button>
        </div>

        {backupResult && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-emerald-200">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Backup Created Successfully!</span>
            </div>
            <p className="font-mono text-[11px] text-emerald-300/90 pl-6">
              File: <strong>{backupResult.fileName}</strong> ({Math.round(backupResult.sizeBytes / 1024)} KB, {backupResult.fileCount} items archived)
            </p>
            <p className="text-[10px] text-emerald-400/70 pl-6">
              Saved at: {backupResult.filePath}
            </p>
          </div>
        )}

        {backupError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{backupError}</span>
          </div>
        )}
      </div>
    </div>
  );
};

