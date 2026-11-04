import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ServerOff,
  Cpu,
  Code2,
  Settings,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useSettings } from '../../store/SettingsContext';
import { useWorkspace } from '../../store/WorkspaceContext';
import { apiClient } from '../../services/apiClient';

export const AIActivityPanel: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const {
    setIsPayloadModalOpen,
    prompt,
    videoMetadata,
    videoFile,
    currentProjectId,
    setCurrentProjectId,
    projectTitle,
    aspectRatio,
    resolution,
    applyAIEditingPlan,
  } = useWorkspace();

  const isConnected = settings.backendConfig.status === 'connected';

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPlanSummary, setLastPlanSummary] = useState<string | null>(null);

  const handleGenerateAIEdits = async () => {
    if (!prompt.trim()) {
      setError('Please enter editing directives before generating cuts.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setCurrentStage('Initializing project workspace...');

      let projId = currentProjectId;

      // 1. Create project if not yet exists in backend
      if (!projId) {
        const proj = await apiClient.createProject({
          title: projectTitle || 'AI Directed Video Cut',
          aspectRatio,
          resolution,
        });
        projId = proj.id;
        setCurrentProjectId(projId);
      }

      // 2. Upload video file to backend if file exists
      if (videoFile) {
        setCurrentStage('Ingesting video to local storage & analyzing scenes...');
        try {
          await apiClient.uploadVideo(projId, videoFile);
        } catch (uploadErr) {
          console.warn('Upload warning:', uploadErr);
        }
      }

      // 3. Dispatch AI Director request to local Ollama
      setCurrentStage('AI Director analyzing scenes, speech & pacing (Ollama)...');
      const { jobId: instructionId } = await apiClient.submitAIEditingJob({
        projectId: projId,
        userPrompt: prompt,
        preferences: {
          aspectRatio,
          resolution,
          frameRate: '30fps',
          style: 'viral-fast',
          pacingDensity: 4,
          cutSilences: true,
          generateCaptions: true,
          autoColorGrade: false,
          addBackgroundMusic: false,
          musicMood: 'chill',
        },
        sourceVideoName: videoMetadata?.name || 'source_clip.mp4',
        sourceDurationSeconds: videoMetadata?.durationSeconds || 30,
        sourceResolution: {
          width: videoMetadata?.width || 1920,
          height: videoMetadata?.height || 1080,
        },
        clientTimestamp: new Date().toISOString(),
      });

      // 4. Poll instruction status
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await apiClient.getInstructionStatus(instructionId);
          const data = statusRes.data;

          if (data.status === 'completed') {
            clearInterval(pollInterval);
            setIsProcessing(false);
            setCurrentStage(null);

            // Fetch editing plan
            const planRes = await apiClient.getProjectPlan(projId!);
            if (planRes && planRes.data) {
              const plan = planRes.data;
              setLastPlanSummary(plan.summary);
              applyAIEditingPlan({
                summary: plan.summary,
                clips: plan.selectedScenes || [],
                captions: plan.captionPlan || [],
              });
            }
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            setIsProcessing(false);
            setCurrentStage(null);
            setError(data.errorMessage || 'AI Director generation encountered an error.');
          } else if (attempts > 60) {
            // 90 second timeout
            clearInterval(pollInterval);
            setIsProcessing(false);
            setCurrentStage(null);
            setError('Generation timed out. Check backend logs.');
          }
        } catch (pollErr) {
          console.warn('Polling error:', pollErr);
        }
      }, 1500);
    } catch (err) {
      setIsProcessing(false);
      setCurrentStage(null);
      setError((err as Error).message);
    }
  };

  return (
    <div className="bg-studio-surface border border-studio-border rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-studio-card border border-studio-border text-studio-muted">
            <Cpu className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-studio-text">AI Pipeline & Activity Status</h3>
            <p className="text-xs text-studio-muted">
              Local neural cut decisioning, whisper speech-to-text, and hardware rendering.
            </p>
          </div>
        </div>

        {isConnected ? (
          <Badge variant="emerald" size="sm" dot>
            Engine Online
          </Badge>
        ) : (
          <Badge variant="neutral" size="sm" dot>
            Backend Offline (Local Mode)
          </Badge>
        )}
      </div>

      {/* Main Execution Card */}
      <div className="bg-studio-card border border-studio-border rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-studio-surface border border-studio-border flex items-center justify-center text-studio-subtle flex-shrink-0 mt-0.5 sm:mt-0">
            {isProcessing ? (
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
            ) : isConnected ? (
              <Sparkles className="w-5 h-5 text-violet-400" />
            ) : (
              <ServerOff className="w-5 h-5 text-studio-muted" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-studio-text">
                {isProcessing
                  ? 'AI Director Running...'
                  : isConnected
                  ? 'Local AI Engine Ready'
                  : 'AI Processing Engine Disconnected'}
              </h4>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-studio-surface text-studio-muted border border-studio-border">
                {isProcessing ? 'Processing' : isConnected ? 'Ollama + Whisper' : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-studio-muted max-w-xl leading-relaxed">
              {currentStage ||
                (isConnected
                  ? 'Local AI engine ready. Click "Generate AI Cuts" to analyze video scenes, transcribe speech, and synthesize timeline cuts.'
                  : 'Backend service offline. Start backend server at http://localhost:3001 to enable automated neural editing.')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          {isConnected && (
            <Button
              variant="primary"
              size="sm"
              disabled={isProcessing}
              isLoading={isProcessing}
              onClick={handleGenerateAIEdits}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Generate AI Cuts
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPayloadModalOpen(true)}
            leftIcon={<Code2 className="w-3.5 h-3.5 text-violet-400" />}
          >
            Payload
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings?tab=backend')}
            leftIcon={<Settings className="w-3.5 h-3.5" />}
          >
            Settings
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {lastPlanSummary && !isProcessing && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1 text-xs text-emerald-300">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>AI Edit Decision List Applied to Timeline</span>
          </div>
          <p className="text-studio-muted leading-relaxed font-mono">{lastPlanSummary}</p>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1 text-xs text-rose-300">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>AI Processing Error</span>
          </div>
          <p className="leading-relaxed">{error}</p>
        </div>
      )}

      {/* Pipeline Readiness Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="p-3 rounded-lg bg-studio-card/60 border border-studio-border flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${videoMetadata ? 'bg-emerald-400' : 'bg-studio-subtle'}`} />
          <div className="min-w-0">
            <span className="text-xs font-medium text-studio-text block truncate">Raw Media Asset</span>
            <span className="text-[11px] text-studio-muted">
              {videoMetadata ? `${videoMetadata.name.slice(0, 18)}...` : 'Awaiting video upload'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-studio-card/60 border border-studio-border flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${prompt.trim() ? 'bg-emerald-400' : 'bg-studio-subtle'}`} />
          <div className="min-w-0">
            <span className="text-xs font-medium text-studio-text block truncate">Editing Directives</span>
            <span className="text-[11px] text-studio-muted">
              {prompt.trim() ? `${prompt.split(' ').length} words configured` : 'Awaiting instructions'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-studio-card/60 border border-studio-border flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-studio-subtle'}`} />
          <div className="min-w-0">
            <span className="text-xs font-medium text-studio-text block truncate">AI Compute Engine</span>
            <span className="text-[11px] text-studio-muted">
              {isConnected ? 'Online & Ready' : 'Backend Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
