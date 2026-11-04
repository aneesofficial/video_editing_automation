import React, { useState, useEffect } from 'react';
import { Download, AlertCircle, Cpu, CheckCircle2, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useWorkspace } from '../../store/WorkspaceContext';
import { useSettings } from '../../store/SettingsContext';
import { apiClient, RenderJobResponse } from '../../services/apiClient';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { projectTitle, aspectRatio, resolution, frameRate, currentProjectId } = useWorkspace();
  const { settings } = useSettings();

  const isConnected = settings.backendConfig.status === 'connected';

  const [isRendering, setIsRendering] = useState(false);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<RenderJobResponse | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Poll render job status
  useEffect(() => {
    if (!renderJobId || !isRendering) return;

    const interval = setInterval(async () => {
      try {
        const job = await apiClient.getRenderJob(renderJobId);
        setJobStatus(job);

        if (job.status === 'completed' || job.status === 'failed') {
          setIsRendering(false);
          clearInterval(interval);
          if (job.status === 'failed') {
            setRenderError(job.errorMessage || 'Rendering failed');
          }
        }
      } catch (err) {
        console.warn('Error polling render job:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [renderJobId, isRendering]);

  const handleStartRender = async () => {
    try {
      setIsRendering(true);
      setRenderError(null);
      setJobStatus(null);

      let projectId = currentProjectId;

      // If no project ID yet, create one in backend
      if (!projectId) {
        const created = await apiClient.createProject({
          title: projectTitle || 'Untitled Video Cut',
          aspectRatio,
          resolution,
        });
        projectId = created.id;
      }

      const { jobId } = await apiClient.createRenderJob(projectId, resolution);
      setRenderJobId(jobId);
    } catch (err) {
      setIsRendering(false);
      setRenderError((err as Error).message);
    }
  };

  const handleClose = () => {
    if (!isRendering) {
      setRenderJobId(null);
      setJobStatus(null);
      setRenderError(null);
    }
    onClose();
  };

  const exportedFile = jobStatus?.exportedFiles?.[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Export Video Sequence"
      description="Review render specifications and dispatch composite video processing."
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isRendering}>
            {jobStatus?.status === 'completed' ? 'Done' : 'Close'}
          </Button>

          {jobStatus?.status === 'completed' && exportedFile ? (
            <a
              href={apiClient.getExportDownloadUrl(exportedFile.id)}
              download={exportedFile.filename}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download MP4</span>
            </a>
          ) : (
            <Button
              variant="primary"
              size="sm"
              disabled={!isConnected || isRendering}
              onClick={handleStartRender}
              isLoading={isRendering}
              leftIcon={<Download className="w-4 h-4" />}
            >
              {isRendering
                ? `Rendering (${jobStatus?.progressPercent || 0}%)`
                : isConnected
                ? 'Start Render'
                : 'Backend Engine Offline'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* Render Specs Summary */}
        <div className="bg-studio-surface border border-studio-border rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-studio-border">
            <span className="text-studio-muted">Project Output Title:</span>
            <span className="font-semibold text-studio-text">{projectTitle}</span>
          </div>
          <div className="flex items-center justify-between text-xs pb-2 border-b border-studio-border">
            <span className="text-studio-muted">Target Aspect Ratio:</span>
            <span className="font-mono text-violet-300 font-semibold">{aspectRatio}</span>
          </div>
          <div className="flex items-center justify-between text-xs pb-2 border-b border-studio-border">
            <span className="text-studio-muted">Master Resolution:</span>
            <span className="font-mono text-studio-text">{resolution}</span>
          </div>
          <div className="flex items-center justify-between text-xs pb-2 border-b border-studio-border">
            <span className="text-studio-muted">Output Framerate:</span>
            <span className="font-mono text-studio-text">{frameRate}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-studio-muted">Container Format:</span>
            <span className="font-mono uppercase text-studio-text">
              {settings.exportDefaults.format} ({settings.exportDefaults.codec})
            </span>
          </div>
        </div>

        {/* Live Progress Bar when rendering */}
        {isRendering && (
          <div className="p-4 bg-studio-surface border border-violet-500/40 rounded-xl space-y-2.5 animate-pulse">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-violet-300 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {jobStatus?.currentStage || 'Encoding video with FFmpeg...'}
              </span>
              <span className="font-mono font-bold text-violet-400">
                {jobStatus?.progressPercent || 0}%
              </span>
            </div>
            <div className="w-full h-2 bg-studio-card rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${jobStatus?.progressPercent || 5}%` }}
              />
            </div>
          </div>
        )}

        {/* Completed State */}
        {jobStatus?.status === 'completed' && exportedFile && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Render Completed Successfully!</span>
            </div>
            <p className="text-studio-muted leading-relaxed font-mono">
              Output file: {exportedFile.filename} • Duration: {exportedFile.duration.toFixed(1)}s • Size: {(exportedFile.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}

        {/* Error State */}
        {renderError && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1 text-xs text-rose-300">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Rendering Error</span>
            </div>
            <p className="leading-relaxed">{renderError}</p>
          </div>
        )}

        {/* Backend Status Notice */}
        {!isConnected ? (
          <div className="p-3.5 bg-studio-surface border border-studio-border rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Backend Service Required for Video Rendering</span>
            </div>
            <p className="text-studio-muted leading-relaxed">
              Export rendering executes via local hardware FFmpeg. Ensure the backend server is running on http://localhost:3001.
            </p>
          </div>
        ) : !isRendering && !jobStatus && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
            <Cpu className="w-4 h-4 flex-shrink-0" />
            <span>Local FFmpeg Render Engine is ready on port 3001.</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
