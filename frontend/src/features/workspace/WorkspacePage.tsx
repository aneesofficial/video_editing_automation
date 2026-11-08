import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Save,
  Download,
  Code2,
  Check,
  AlertCircle,
  History,
  Sparkles,
  Monitor,
  Smartphone,
  Square,
  ChevronDown,
  ChevronUp,
  Layers,
  Wand2,
  Clock,
  Scissors,
  Music,
  FileText,
  Loader2,
  Video as VideoIcon,
  Image as ImageIcon,
  Play,
  XCircle,
  Cpu,
  RefreshCw,
  Zap,
  Globe,
  Key,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { VideoUploader } from '../../components/video/VideoUploader';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { MediaLibrary } from '../../components/media/MediaLibrary';
import { StockMediaPanel } from '../../components/media/StockMediaPanel';
import { PromptEditor } from '../../components/editor/PromptEditor';
import { StylePreferences } from '../../components/editor/StylePreferences';
import { Timeline } from '../../components/editor/Timeline';
import { AIActivityPanel } from '../../components/editor/AIActivityPanel';
import { JobPayloadModal } from '../../components/editor/JobPayloadModal';
import { ExportModal } from '../../components/editor/ExportModal';
import { PhotoEditingWorkspace } from './PhotoEditingWorkspace';
import { useWorkspace } from '../../store/WorkspaceContext';
import { useProjects } from '../../store/ProjectContext';
import {
  apiClient,
  AIStatusResponse,
  GeminiEditingPlan,
  ProjectPlanItem,
  HardwareEncoderInfo,
} from '../../services/apiClient';
import { backendToFrontendProject } from '../../services/projectStorage';
import { ProjectVersion } from '../../types/project';
import { formatDate, formatBytes, formatSimpleDuration } from '../../utils/formatters';

interface FrameOption {
  id: string;
  name: string;
  platform: string;
  aspectRatio: string;
  resolution: string;
  badge: string;
  icon: 'landscape' | 'vertical' | 'square' | 'portrait';
}

const FRAME_OPTIONS: FrameOption[] = [
  {
    id: 'yt-16-9',
    name: 'YouTube',
    platform: 'YouTube 16:9',
    aspectRatio: '16:9',
    resolution: '1920x1080',
    badge: '16:9 (1920x1080)',
    icon: 'landscape',
  },
  {
    id: 'yt-shorts',
    name: 'YouTube Shorts',
    platform: 'YouTube Shorts 9:16',
    aspectRatio: '9:16',
    resolution: '1080x1920',
    badge: '9:16 (1080x1920)',
    icon: 'vertical',
  },
  {
    id: 'tiktok-9-16',
    name: 'TikTok',
    platform: 'TikTok 9:16',
    aspectRatio: '9:16',
    resolution: '1080x1920',
    badge: '9:16 (1080x1920)',
    icon: 'vertical',
  },
  {
    id: 'ig-reel',
    name: 'Instagram Reel',
    platform: 'Instagram Reel 9:16',
    aspectRatio: '9:16',
    resolution: '1080x1920',
    badge: '9:16 (1080x1920)',
    icon: 'vertical',
  },
  {
    id: 'ig-post-1-1',
    name: 'Instagram Post (1:1)',
    platform: 'Instagram Post 1:1',
    aspectRatio: '1:1',
    resolution: '1080x1080',
    badge: '1:1 (1080x1080)',
    icon: 'square',
  },
  {
    id: 'ig-post-4-5',
    name: 'Instagram Post (4:5)',
    platform: 'Instagram Post 4:5',
    aspectRatio: '4:5',
    resolution: '1080x1350',
    badge: '4:5 (1080x1350)',
    icon: 'portrait',
  },
];

const EXAMPLE_PROMPTS = [
  'Join these clips into a 20 second vertical reel, cut silences, add captions, use zoom on important moments',
  'Assemble a fast-paced highlights teaser: remove quiet pauses, add punchy captions, and use Ken Burns zoom on photos',
  'Create a smooth social media story cutting dead air, prioritizing dialogue segments with dynamic captions',
  'Combine all uploaded footage with quick cuts, sound ducking, and auto transitions matching an upbeat tempo',
];

export const WorkspacePage: React.FC = () => {
  const { projectId: urlProjectId } = useParams<{ projectId?: string }>();

  const {
    projectTitle,
    setProjectTitle,
    isDirty,
    setIsDirty,
    videoMetadata,
    prompt,
    setPrompt,
    promptTags,
    getPreferencesSnapshot,
    duration,
    currentProjectId,
    setCurrentProjectId,
    loadProjectData,
    setIsPayloadModalOpen,
    mediaItems,
    setCustomVideoPreview,
    generateMissingPreviews,
  } = useWorkspace();

  const [workspaceMode, setWorkspaceMode] = useState<'video' | 'photo'>('video');

  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);

  const { saveProject, isBackendOnline, backendError } = useProjects();
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [clientName, setClientName] = useState<string>('General');

  // Gemini AI Planner State
  const [aiStatus, setAiStatus] = useState<AIStatusResponse | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<FrameOption>(FRAME_OPTIONS[1]); // Default Shorts 9:16
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [planStage, setPlanStage] = useState<string>('');
  const [planError, setPlanError] = useState<string | null>(null);
  const [planSuccess, setPlanSuccess] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<GeminiEditingPlan | null>(null);
  const [planVersions, setPlanVersions] = useState<ProjectPlanItem[]>([]);
  const [selectedPlanVersion, setSelectedPlanVersion] = useState<string>('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  // Step 5A Autonomous FFmpeg Rendering State
  const [hardwareEncoder, setHardwareEncoder] = useState<HardwareEncoderInfo | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderingJobId, setRenderingJobId] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderStage, setRenderStage] = useState<string>('');
  const [renderSpeed, setRenderSpeed] = useState<string | undefined>(undefined);
  const [renderEta, setRenderEta] = useState<number | undefined>(undefined);
  const [renderMode, setRenderMode] = useState<'draft' | 'final' | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [activeExport, setActiveExport] = useState<{
    id?: string;
    versionTag: string;
    publicUrl: string;
    filename: string;
    duration?: number;
    fileSizeBytes?: number;
    mode?: 'draft' | 'final';
  } | null>(null);

  // Step 5B Feature Toggles & Polish Options
  const [optCaptions, setOptCaptions] = useState<boolean>(true);
  const [optCaptionStyle, setOptCaptionStyle] = useState<'viral' | 'clean' | 'minimal'>('viral');
  const [optMusic, setOptMusic] = useState<boolean>(false);
  const [optMusicMood, setOptMusicMood] = useState<string>('upbeat');
  const [optBrandKit, setOptBrandKit] = useState<boolean>(true);
  const [optSilenceRemoval, setOptSilenceRemoval] = useState<boolean>(true);

  // Step 8 Feature: Stock Media & Auto B-Roll
  const [activeMediaSectionTab, setActiveMediaSectionTab] = useState<'library' | 'stock'>('library');
  const [autoBRoll, setAutoBRoll] = useState<boolean>(false);
  const [excludedBRollIds, setExcludedBRollIds] = useState<string[]>([]);

  // Gemini API Key Inline Configuration State (Saved only to backend/.env, never in localStorage)
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>('');
  const [isSavingGeminiKey, setIsSavingGeminiKey] = useState<boolean>(false);
  const [geminiKeyError, setGeminiKeyError] = useState<string | null>(null);
  const [geminiKeySuccess, setGeminiKeySuccess] = useState<string | null>(null);
  const [showGeminiKeyEdit, setShowGeminiKeyEdit] = useState<boolean>(false);

  const handleSaveGeminiKey = async () => {
    if (!geminiKeyInput.trim()) return;
    setIsSavingGeminiKey(true);
    setGeminiKeyError(null);
    setGeminiKeySuccess(null);
    try {
      const res = await apiClient.saveAiKey(geminiKeyInput.trim());
      if (res.success) {
        setGeminiKeySuccess('Gemini API key saved & verified successfully!');
        setGeminiKeyInput('');
        setShowGeminiKeyEdit(false);
        const fresh = await apiClient.getAiStatus();
        setAiStatus(fresh);
      } else {
        setGeminiKeyError(res.error || 'Failed to verify Gemini API key');
      }
    } catch (err: any) {
      setGeminiKeyError(err.message || 'Error saving Gemini API key');
    } finally {
      setIsSavingGeminiKey(false);
    }
  };

  // Sync toggles when an active plan is selected or loaded
  useEffect(() => {
    if (activePlan) {
      if (activePlan.audio?.musicEnabled !== undefined) {
        setOptMusic(activePlan.audio.musicEnabled);
      }
      if (activePlan.audio?.mood) {
        setOptMusicMood(activePlan.audio.mood);
      }
      if (activePlan.silenceRemoval?.enabled !== undefined) {
        setOptSilenceRemoval(activePlan.silenceRemoval.enabled);
      }
      if (activePlan.captions && activePlan.captions.length > 0) {
        setOptCaptions(true);
      }
    }
  }, [activePlan]);

  // Query hardware encoder & AI status on mount
  useEffect(() => {
    apiClient
      .getHardwareEncoder()
      .then((info) => setHardwareEncoder(info))
      .catch((err) => console.warn('Could not query hardware encoder:', err));
  }, []);

  // Poll or fetch AI status on mount
  useEffect(() => {
    apiClient
      .getAiStatus()
      .then((status) => setAiStatus(status))
      .catch((err) => {
        setAiStatus({
          online: false,
          model: 'gemini-3.5-flash',
          hasKey: false,
          maskedKey: null,
          visionEnabled: false,
          reason: 'Cannot connect to backend server',
        });
      });
  }, []);

  // Load project from URL param if available
  useEffect(() => {
    if (urlProjectId && urlProjectId !== currentProjectId) {
      apiClient
        .getProject(urlProjectId)
        .then((bp) => {
          const frontendProject = backendToFrontendProject(bp);
          loadProjectData(frontendProject);
          if (bp.clientName) setClientName(bp.clientName);
          else if (bp.client?.name) setClientName(bp.client.name);
          if (bp.versions) setVersions(bp.versions);

          // Match saved targetPlatform to frame options
          if (bp.targetPlatform) {
            const matched = FRAME_OPTIONS.find(
              (f) =>
                f.platform.toLowerCase() === bp.targetPlatform?.toLowerCase() ||
                f.aspectRatio === bp.aspectRatio
            );
            if (matched) setSelectedFrame(matched);
          }

          // Fetch plan versions for this project
          apiClient
            .listProjectPlans(urlProjectId)
            .then((plans) => {
              setPlanVersions(plans);
              if (plans.length > 0) {
                setActivePlan(plans[0].plan);
                setSelectedPlanVersion(plans[0].version);
              }
            })
            .catch(() => {});
        })
        .catch((err) => {
          console.warn('Could not load project from URL param:', err);
        });
    }
  }, [urlProjectId, currentProjectId, loadProjectData]);

  // Load export versions when current project changes
  useEffect(() => {
    if (!currentProjectId) {
      setVersions([]);
      setPlanVersions([]);
      return;
    }

    apiClient
      .listVersions(currentProjectId)
      .then((data) => {
        setVersions(data);
        if (data.length > 0 && !activeExport) {
          const latest = data[0];
          const isDraft =
            latest.notes?.toLowerCase().includes('draft') ||
            latest.filename.toLowerCase().includes('draft');
          setActiveExport({
            id: latest.id,
            versionTag: latest.versionTag,
            publicUrl: latest.publicUrl,
            filename: latest.filename,
            duration: latest.duration || undefined,
            fileSizeBytes: latest.fileSizeBytes || undefined,
            mode: isDraft ? 'draft' : 'final',
          });
        }
      })
      .catch(() => {});

    apiClient
      .listProjectPlans(currentProjectId)
      .then((plans) => {
        setPlanVersions(plans);
        if (plans.length > 0 && !activePlan) {
          setActivePlan(plans[0].plan);
          setSelectedPlanVersion(plans[0].version);
        }
      })
      .catch(() => {});
  }, [currentProjectId, isExportModalOpen]);

  // Automatic debounce save
  useEffect(() => {
    if (!isDirty || !currentProjectId) return;

    const timer = setTimeout(async () => {
      try {
        await saveProject({
          id: currentProjectId,
          title: projectTitle || 'Untitled Video Cut',
          description: prompt ? `${prompt.slice(0, 80)}...` : 'Automated AI video project',
          status: videoMetadata ? 'ready' : 'draft',
          videoMetadata,
          rawPrompt: prompt,
          tags: promptTags,
          preferences: getPreferencesSnapshot(),
          durationSeconds: duration,
        });
        setIsDirty(false);
        setSaveSuccessMessage('Auto-saved to database');
        setTimeout(() => setSaveSuccessMessage(null), 2000);
      } catch (err) {
        console.warn('Auto-save error:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    isDirty,
    currentProjectId,
    projectTitle,
    prompt,
    promptTags,
    duration,
    saveProject,
    setIsDirty,
    videoMetadata,
    getPreferencesSnapshot,
  ]);

  const handleManualSave = async () => {
    try {
      const now = new Date().toISOString();
      const saved = await saveProject({
        id: currentProjectId || undefined,
        title: projectTitle || 'Untitled Video Cut',
        description: prompt ? `${prompt.slice(0, 80)}...` : 'Automated AI video project',
        createdAt: now,
        updatedAt: now,
        status: videoMetadata ? 'ready' : 'draft',
        videoMetadata,
        rawPrompt: prompt,
        tags: promptTags,
        preferences: getPreferencesSnapshot(),
        durationSeconds: duration,
      });

      if (!currentProjectId) {
        setCurrentProjectId(saved.id);
      }
      setIsDirty(false);
      setSaveSuccessMessage('Saved to database');
      setTimeout(() => setSaveSuccessMessage(null), 2500);
    } catch (err) {
      console.error('Manual save failed:', err);
    }
  };

  const handleSelectPlanVersion = (versionItem: ProjectPlanItem) => {
    setActivePlan(versionItem.plan);
    setSelectedPlanVersion(versionItem.version);
  };

  const startRenderJob = async (
    mode: 'draft' | 'final',
    planVer?: string,
    overrideOptions?: {
      captions?: boolean;
      captionStyle?: 'viral' | 'clean' | 'minimal';
      music?: boolean;
      musicMood?: string;
      useBrandKit?: boolean;
      silenceRemoval?: boolean;
    }
  ) => {
    if (!currentProjectId) {
      setRenderError('No active project found.');
      return;
    }
    setIsRendering(true);
    setRenderMode(mode);
    setRenderProgress(5);
    setRenderStage(`Submitting ${mode.toUpperCase()} render job...`);
    setRenderEta(undefined);
    setRenderSpeed(undefined);
    setRenderError(null);
    setIsCancelling(false);

    try {
      const targetPlanVer =
        planVer || selectedPlanVersion || (planVersions.length > 0 ? planVersions[0].version : 'v1');
      const response = await apiClient.createRenderJob(currentProjectId, {
        mode,
        planVersion: targetPlanVer,
        options: overrideOptions || {
          captions: optCaptions,
          captionStyle: optCaptionStyle,
          music: optMusic,
          musicMood: optMusicMood,
          useBrandKit: optBrandKit,
          silenceRemoval: optSilenceRemoval,
          bRollEnabled: true,
          excludedBRollIds,
        },
      });

      const jobId = response.jobId;
      setRenderingJobId(jobId);
      setRenderStage(`Queued in ${mode.toUpperCase()} mode...`);

      // Poll every 800ms
      const pollInterval = setInterval(async () => {
        try {
          const job = await apiClient.getRenderJob(jobId);

          if (job.status === 'processing') {
            setRenderProgress(job.progressPercent || 5);
            setRenderStage(
              job.currentStage || `Rendering ${mode.toUpperCase()} video (${job.progressPercent}%)`
            );
            if (job.details) {
              setRenderEta(job.details.etaSeconds);
              setRenderSpeed(job.details.speed);
            }
          } else if (job.status === 'completed') {
            clearInterval(pollInterval);
            setIsRendering(false);
            setRenderingJobId(null);
            setRenderProgress(100);
            setRenderStage('Render completed successfully!');

            // Reload versions and load the rendered video into preview monitor
            const refreshedVersions = await apiClient.listVersions(currentProjectId);
            setVersions(refreshedVersions);

            const latestExport =
              job.exportedFiles && job.exportedFiles.length > 0
                ? job.exportedFiles[0]
                : refreshedVersions.length > 0
                ? refreshedVersions[0]
                : null;

            if (latestExport) {
              setActiveExport({
                id: latestExport.id,
                versionTag: (latestExport as any).versionTag || 'v1',
                publicUrl: latestExport.publicUrl,
                filename: latestExport.filename,
                duration: latestExport.duration || undefined,
                fileSizeBytes: latestExport.fileSizeBytes || undefined,
                mode,
              });
              setCustomVideoPreview(
                latestExport.publicUrl,
                latestExport.filename,
                latestExport.duration || undefined
              );
            }

            setPlanSuccess(
              `${mode === 'draft' ? 'Draft' : 'Final'} video successfully rendered as ${
                (latestExport as any)?.versionTag || 'new version'
              }!`
            );
          } else if (job.status === 'failed') {
            clearInterval(pollInterval);
            setIsRendering(false);
            setRenderingJobId(null);
            setRenderError(job.errorMessage || 'Video rendering failed');
          } else if (job.status === 'cancelled') {
            clearInterval(pollInterval);
            setIsRendering(false);
            setRenderingJobId(null);
            setRenderStage('Render cancelled by user');
          }
        } catch (pollErr: any) {
          console.warn('Error polling render job:', pollErr);
        }
      }, 800);
    } catch (err: any) {
      setIsRendering(false);
      setRenderingJobId(null);
      setRenderError(err?.message || 'Failed to start rendering job');
    }
  };

  const handleCancelRender = async () => {
    if (!renderingJobId) return;
    setIsCancelling(true);
    try {
      await apiClient.cancelRenderJob(renderingJobId);
      setRenderStage('Render cancelled by user');
      setIsRendering(false);
      setRenderingJobId(null);
    } catch (e: any) {
      console.warn('Cancel render error:', e);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleGenerateEdit = async () => {
    setPlanError(null);
    setPlanSuccess(null);

    const userPrompt = (prompt || '').trim();
    if (!userPrompt) {
      setPlanError('Please enter a prompt or click an example above to describe your edit.');
      return;
    }

    if (!currentProjectId) {
      setPlanError('Please create or open a project first.');
      return;
    }

    if (!mediaItems || mediaItems.length === 0) {
      setPlanError('Please upload at least one video or photo to the Media Library first.');
      return;
    }

    if (aiStatus && !aiStatus.online) {
      setPlanError(
        `Gemini AI is currently offline (${aiStatus.reason || 'Check API key'}). Please check Settings > AI Engine Backend.`
      );
      return;
    }

    setIsGeneratingPlan(true);
    setPlanStage('1/3: Analyzing uploaded media assets (PySceneDetect + Whisper)...');

    try {
      const timerStage2 = setTimeout(() => {
        setPlanStage('2/3: Detecting dialogue silences & generating SDR tone map context...');
      }, 2500);

      const timerStage3 = setTimeout(() => {
        setPlanStage('3/3: Google Gemini synthesizing optimal cut sequence, motions & captions...');
      }, 5500);

      const response = await apiClient.generateAiPlan(currentProjectId, {
        userPrompt,
        targetPlatform: selectedFrame.platform,
        aspectRatio: selectedFrame.aspectRatio,
        resolution: selectedFrame.resolution,
        autoBRoll,
      });

      clearTimeout(timerStage2);
      clearTimeout(timerStage3);

      if (response && response.data) {
        setActivePlan(response.data.plan);
        setSelectedPlanVersion(response.data.version);
        setPlanSuccess(
          `Edit plan generated successfully as ${response.data.version}! Starting Draft render...`
        );

        // Refresh project plan versions
        const refreshedPlans = await apiClient.listProjectPlans(currentProjectId);
        setPlanVersions(refreshedPlans);

        // Reload project to update timeline & preview monitor
        const updatedProject = await apiClient.getProject(currentProjectId);
        loadProjectData(backendToFrontendProject(updatedProject));

        // Autonomous Step 5A render: immediately trigger Draft render
        await startRenderJob('draft', response.data.version);
      }
    } catch (err: any) {
      console.error('AI plan generation error:', err);
      setPlanError(err?.message || 'Failed to generate edit plan. Please check your Gemini API key in Settings.');
    } finally {
      setIsGeneratingPlan(false);
      setPlanStage('');
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-16">
      {/* Backend offline alert */}
      {!isBackendOnline && (
        <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-3 mx-4 sm:mx-6 mt-4 flex items-center gap-3 text-rose-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <div className="text-xs">
            <span className="font-semibold text-sm block text-rose-200">Backend is not running</span>
            {backendError ||
              'Cannot connect to backend server at http://localhost:3001. Changes cannot be synced to the database.'}
          </div>
        </div>
      )}

      {/* Top Workspace Bar */}
      <div className="bg-studio-surface border-b border-studio-border px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => {
              setProjectTitle(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Untitled Project"
            className="text-sm font-semibold bg-transparent border border-transparent hover:border-studio-border focus:border-violet-500 rounded px-2 py-1 text-white focus:outline-none transition-colors max-w-xs sm:max-w-sm truncate"
          />

          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-studio-card border border-studio-border text-studio-muted">
            <span>Client:</span>
            <span className="text-white font-semibold">{clientName}</span>
          </span>

          {saveSuccessMessage ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
              <Check className="w-3.5 h-3.5" />
              <span>{saveSuccessMessage}</span>
            </span>
          ) : isDirty ? (
            <span className="text-[11px] text-amber-400 font-mono">• Unsaved</span>
          ) : (
            <span className="text-[11px] text-studio-subtle font-mono hidden md:inline">Saved</span>
          )}
        </div>

        {/* AI Status Badge */}
        <div className="flex items-center gap-2">
          {aiStatus?.online ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Online with Gemini ({aiStatus.model})</span>
            </span>
          ) : (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 border border-rose-500/30 text-rose-300 max-w-xs truncate"
              title={aiStatus?.reason || 'Gemini Offline'}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <span className="truncate">
                {aiStatus?.reason ? `Gemini Offline: ${aiStatus.reason}` : 'Gemini Offline (Check Settings)'}
              </span>
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPayloadModalOpen(true)}
            leftIcon={<Code2 className="w-3.5 h-3.5 text-violet-400" />}
            title="Inspect AI prompt & plan payload"
          >
            Payload
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleManualSave}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Main Flow: Top to Bottom */}
      <div className="flex-1 p-4 sm:p-6 space-y-8 max-w-5xl mx-auto w-full">
        {/* Workspace Mode Switcher: Video vs Photo */}
        <div className="flex items-center justify-center pb-2">
          <div className="inline-flex items-center bg-studio-card border border-studio-border p-1 rounded-xl shadow-lg shadow-black/40">
            <button
              type="button"
              onClick={() => setWorkspaceMode('video')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                workspaceMode === 'video'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <VideoIcon className="w-4 h-4" />
              <span>Video Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceMode('photo')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                workspaceMode === 'photo'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Photo Mode</span>
            </button>
          </div>
        </div>

        {workspaceMode === 'photo' ? (
          <PhotoEditingWorkspace
            projectId={currentProjectId || ''}
            onPhotoImportedToVideo={async () => {
              await generateMissingPreviews(currentProjectId || undefined);
            }}
          />
        ) : (
          <>
            {/* Step 1: Upload Box */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-600/30 text-violet-300 font-bold text-xs border border-violet-500/30">
              1
            </span>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
              Upload Media (Videos & Photos)
            </h2>
          </div>
          <VideoUploader />
        </section>

        {/* Step 2: Media Library & Stock Media */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-studio-border/60 pb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-600/30 text-violet-300 font-bold text-xs border border-violet-500/30">
                2
              </span>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                Project Media & Stock B-Roll
              </h2>
            </div>

            <div className="flex items-center gap-1 bg-studio-card p-0.5 rounded-lg border border-studio-border">
              <button
                type="button"
                onClick={() => setActiveMediaSectionTab('library')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeMediaSectionTab === 'library'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-studio-muted hover:text-white'
                }`}
              >
                Media Library ({mediaItems.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveMediaSectionTab('stock')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeMediaSectionTab === 'stock'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-studio-muted hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Stock Media (Pexels / Pixabay)</span>
              </button>
            </div>
          </div>

          {activeMediaSectionTab === 'library' ? (
            <MediaLibrary />
          ) : (
            <StockMediaPanel
              currentAspectRatio={selectedFrame.aspectRatio}
              projectId={currentProjectId || undefined}
              onImportSuccess={async () => {
                if (currentProjectId) {
                  try {
                    const updated = await apiClient.getProject(currentProjectId);
                    loadProjectData(backendToFrontendProject(updated));
                  } catch (e) {
                    console.warn('Could not refresh project after stock import:', e);
                  }
                }
              }}
            />
          )}
        </section>

        {/* Step 3: Frame Choice (Big Buttons) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-600/30 text-violet-300 font-bold text-xs border border-violet-500/30">
                3
              </span>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                Choose Output Frame
              </h2>
            </div>
            <span className="text-xs text-studio-muted">
              Selected: <strong className="text-white">{selectedFrame.platform}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {FRAME_OPTIONS.map((opt) => {
              const isSelected = selectedFrame.id === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedFrame(opt)}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all group ${
                    isSelected
                      ? 'bg-violet-600/20 border-violet-500 ring-2 ring-violet-500/40 shadow-lg shadow-violet-950/30'
                      : 'bg-studio-surface border-studio-border hover:border-studio-subtle hover:bg-studio-card'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    {opt.icon === 'landscape' && (
                      <Monitor className={`w-5 h-5 ${isSelected ? 'text-violet-400' : 'text-studio-muted'}`} />
                    )}
                    {opt.icon === 'vertical' && (
                      <Smartphone className={`w-5 h-5 ${isSelected ? 'text-violet-400' : 'text-studio-muted'}`} />
                    )}
                    {opt.icon === 'square' && (
                      <Square className={`w-5 h-5 ${isSelected ? 'text-violet-400' : 'text-studio-muted'}`} />
                    )}
                    {opt.icon === 'portrait' && (
                      <Smartphone className={`w-5 h-5 ${isSelected ? 'text-violet-400' : 'text-studio-muted'}`} />
                    )}
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-violet-500/30 text-violet-200 font-bold'
                          : 'bg-studio-card text-studio-subtle'
                      }`}
                    >
                      {opt.aspectRatio}
                    </span>
                  </div>
                  <div>
                    <h4
                      className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-white' : 'text-studio-text group-hover:text-white'
                      }`}
                    >
                      {opt.name}
                    </h4>
                    <p className="text-[10px] text-studio-muted font-mono mt-0.5">{opt.resolution}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Gemini API Key Box (directly above prompt box: shows password input if offline/missing, or small green badge if online) */}
        {aiStatus?.online && aiStatus?.hasKey && !showGeminiKeyEdit ? (
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-emerald-300">Gemini AI Online</span>
              <span className="text-emerald-400/80 font-mono text-[11px]">({aiStatus.model})</span>
              {aiStatus.maskedKey && (
                <span className="text-emerald-400/60 font-mono text-[10px]">Key: {aiStatus.maskedKey}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowGeminiKeyEdit(true)}
              className="text-[11px] text-emerald-400 hover:text-emerald-200 underline font-medium transition-colors"
            >
              Change Key
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-studio-surface border border-studio-border space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-semibold text-white">Google Gemini API Key</span>
              </div>
              <div className="flex items-center gap-2">
                {aiStatus?.online ? (
                  <Badge variant="emerald" size="sm">Online</Badge>
                ) : (
                  <Badge variant="rose" size="sm">Offline / Key Required</Badge>
                )}
                {aiStatus?.online && (
                  <button
                    type="button"
                    onClick={() => setShowGeminiKeyEdit(false)}
                    className="text-[11px] text-studio-muted hover:text-white underline"
                  >
                    Hide
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-studio-muted leading-relaxed">
              Enter your Google AI Studio free API key. It is tested and saved directly into{' '}
              <code className="text-violet-300 font-mono text-[10px] bg-studio-card px-1 py-0.5 rounded">backend/.env</code> (never stored in browser localStorage).
            </p>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={geminiKeyInput}
                onChange={(e) => {
                  setGeminiKeyInput(e.target.value);
                  setGeminiKeyError(null);
                  setGeminiKeySuccess(null);
                }}
                placeholder={aiStatus?.hasKey ? `Configured (${aiStatus.maskedKey || 'saved'})` : 'Paste Gemini API key (AIzaSy...)'}
                className="flex-1 bg-studio-card border border-studio-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-studio-subtle focus:outline-none focus:border-violet-500 font-mono"
              />
              <Button
                size="sm"
                variant="primary"
                disabled={isSavingGeminiKey || !geminiKeyInput.trim()}
                onClick={handleSaveGeminiKey}
                className="flex items-center gap-1.5 text-xs whitespace-nowrap"
              >
                {isSavingGeminiKey ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing & Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Test & Save</span>
                  </>
                )}
              </Button>
            </div>
            {geminiKeyError && (
              <p className="text-xs text-rose-400 flex items-center gap-1.5 mt-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{geminiKeyError}</span>
              </p>
            )}
            {geminiKeySuccess && (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5 mt-1">
                <Check className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{geminiKeySuccess}</span>
              </p>
            )}
          </div>
        )}

        {/* Step 4: Big Prompt Box with Example Prompts */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-600/30 text-violet-300 font-bold text-xs border border-violet-500/30">
                4
              </span>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                Editing Instructions & Prompt
              </h2>
            </div>
            <span className="text-[11px] text-studio-muted">Click an example prompt below to fill</span>
          </div>

          {/* Example prompt pills */}
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((exPrompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setPrompt(exPrompt);
                  setIsDirty(true);
                }}
                className="text-left text-xs px-3 py-1.5 rounded-lg bg-studio-surface border border-studio-border hover:border-violet-500/50 hover:bg-studio-card text-studio-muted hover:text-white transition-all"
              >
                💡 {exPrompt}
              </button>
            ))}
          </div>

          {/* Large Prompt Textarea */}
          <div className="relative">
            <textarea
              ref={promptInputRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setIsDirty(true);
              }}
              rows={4}
              placeholder="e.g. Join these clips into a 20 second vertical reel, cut silences, add captions, use zoom on important moments..."
              className="w-full bg-studio-surface border border-studio-border rounded-xl p-4 text-sm text-white placeholder-studio-subtle focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all leading-relaxed font-sans"
            />
          </div>

          {/* Step 8 Feature: Auto B-Roll Switch */}
          <div className="flex items-center justify-between p-3.5 bg-studio-surface border border-studio-border rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">Auto B-Roll from Prompt</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Pexels + Pixabay
                  </span>
                </div>
                <p className="text-[11px] text-studio-muted mt-0.5">
                  Gemini will automatically find stock video cutaways matching dialogue and insert them. Master audio plays uninterrupted.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
              <input
                type="checkbox"
                checked={autoBRoll}
                onChange={(e) => setAutoBRoll(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-studio-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 border border-studio-border"></div>
            </label>
          </div>
        </section>

        {/* Step 5: Big Generate Edit Button & Autonomous Rendering */}
        <section className="space-y-3">
          {planError && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-200 block text-sm">Planning Error</span>
                <span>{planError}</span>
              </div>
            </div>
          )}

          {renderError && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start justify-between gap-3 text-rose-300 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <span className="font-semibold text-rose-200 block text-sm">Rendering Error</span>
                  <span>{renderError}</span>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => startRenderJob(renderMode || 'draft')}
                className="text-xs py-1 h-7 flex-shrink-0"
              >
                Retry Render
              </Button>
            </div>
          )}

          {planSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-2 text-emerald-300 text-xs">
              <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{planSuccess}</span>
            </div>
          )}

          <Button
            type="button"
            variant="primary"
            size="lg"
            disabled={isGeneratingPlan || isRendering || !prompt.trim()}
            isLoading={isGeneratingPlan || isRendering}
            onClick={handleGenerateEdit}
            className="w-full py-4 text-base font-bold shadow-xl shadow-violet-950/50 flex items-center justify-center gap-2.5 rounded-xl transition-all"
            leftIcon={!isGeneratingPlan && !isRendering ? <Wand2 className="w-5 h-5 text-violet-200" /> : undefined}
          >
            {isGeneratingPlan
              ? 'Synthesizing Edit with Gemini...'
              : isRendering
              ? `Rendering ${renderMode?.toUpperCase() || 'VIDEO'} (${renderProgress}%)...`
              : 'Generate Edit with AI'}
          </Button>

          {/* Active Encoder & Target Frame Status */}
          <div className="flex flex-wrap items-center justify-between text-xs text-studio-muted px-1 gap-2">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
              <span>Active Encoder:</span>
              <span className="font-semibold text-white">
                {hardwareEncoder ? hardwareEncoder.description : 'libx264 (Multi-threaded CPU Software Encoder)'}
              </span>
            </div>
            <span className="text-[11px] text-studio-subtle font-mono">
              Target Frame: {selectedFrame.badge} • 30 fps
            </span>
          </div>

          {/* Plan Generation Loader */}
          {isGeneratingPlan && planStage && (
            <div className="p-3.5 rounded-xl bg-studio-surface border border-studio-border text-center space-y-2 animate-pulse">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-violet-300">
                <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                <span>{planStage}</span>
              </div>
              <p className="text-[11px] text-studio-muted">
                Running scene detection, speech transcription, silence trimming, and tone mapping automatically.
              </p>
            </div>
          )}

          {/* Real-Time Background Render Progress Card with Cancel Button */}
          {isRendering && (
            <div className="p-4 rounded-xl bg-studio-card border border-violet-500/40 space-y-3 shadow-lg shadow-violet-950/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Rendering {renderMode?.toUpperCase() || 'VIDEO'}...
                  </span>
                  <span className="text-xs font-mono font-bold text-violet-300">
                    {renderProgress}%
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {renderEta !== undefined && renderEta > 0 && (
                    <span className="text-[11px] text-studio-muted font-mono">
                      ETA: ~{renderEta}s
                    </span>
                  )}
                  {renderSpeed && (
                    <span className="text-[11px] text-studio-muted font-mono">
                      Speed: {renderSpeed}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isCancelling}
                    onClick={handleCancelRender}
                    className="border-rose-500/50 hover:bg-rose-950/30 text-rose-300 text-xs py-1 h-7"
                    leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-400" />}
                  >
                    {isCancelling ? 'Cancelling...' : 'Cancel Render'}
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-studio-surface rounded-full h-2 overflow-hidden border border-studio-border">
                <div
                  className="bg-gradient-to-r from-violet-600 via-indigo-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, renderProgress)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-studio-muted">
                <span>{renderStage || 'Processing audio and video filters with FFmpeg...'}</span>
                <span>Encoder: {hardwareEncoder?.encoder || 'libx264'}</span>
              </div>
            </div>
          )}
        </section>

        {/* Step 6: Result Area (Plan Cards + Preview Monitor + Export Versions) */}
        {(activePlan || planVersions.length > 0 || versions.length > 0) && (
          <section className="space-y-6 pt-4 border-t border-studio-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-600/30 text-violet-300 font-bold text-xs border border-violet-500/30">
                  5
                </span>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                  Generated Edit Result & Preview
                </h2>
              </div>

              {/* Plan Version Switcher */}
              {planVersions.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-studio-muted mr-1">Plan Version:</span>
                  {planVersions.map((pv) => {
                    const isSelected = selectedPlanVersion === pv.version;
                    return (
                      <button
                        key={pv.id}
                        type="button"
                        onClick={() => handleSelectPlanVersion(pv)}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                          isSelected
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'bg-studio-surface border border-studio-border text-studio-muted hover:text-white'
                        }`}
                      >
                        {pv.version}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Preview Monitor with Action Bar */}
            <div className="bg-studio-surface border border-studio-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-studio-border pb-2.5">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-violet-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                    Preview Monitor (Finished Video & Sources)
                  </h3>
                  {activeExport && (
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        activeExport.mode === 'final'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {activeExport.versionTag} ({activeExport.mode?.toUpperCase()})
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-studio-subtle font-mono">
                  {selectedFrame.platform} • {selectedFrame.resolution}
                </span>
              </div>
              <VideoPlayer />

              {/* Action Bar: Make Final Quality, Regenerate, Download */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-studio-border">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isRendering || isGeneratingPlan}
                    onClick={() => startRenderJob('final')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    leftIcon={<Sparkles className="w-3.5 h-3.5 text-emerald-200" />}
                  >
                    Make Final Quality (Full Frame)
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isRendering || isGeneratingPlan}
                    onClick={() => {
                      promptInputRef.current?.focus();
                      promptInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5 text-violet-400" />}
                  >
                    Regenerate with New Prompt
                  </Button>
                </div>

                {activeExport && (
                  <a
                    href={apiClient.getVideoFileUrl(activeExport.publicUrl)}
                    download={activeExport.filename}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-studio-card border border-studio-border hover:border-studio-subtle text-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-violet-400" />
                    <span>Download Video ({activeExport.versionTag})</span>
                  </a>
                )}
              </div>
            </div>

            {/* Plan Details Cards */}
            {activePlan && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Summary & Rationale Card */}
                <div className="md:col-span-3 bg-studio-surface border border-studio-border rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      <h3 className="text-sm font-bold text-white">Director Rationale & Summary</h3>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      Duration: ~{Math.round(activePlan.targetDurationSeconds)}s
                    </span>
                  </div>
                  <p className="text-xs text-studio-text leading-relaxed font-medium">
                    {activePlan.summary}
                  </p>
                  <p className="text-xs text-studio-muted leading-relaxed italic border-l-2 border-violet-500 pl-3">
                    "{activePlan.explanation}"
                  </p>
                </div>

                {/* Segments & Motion Effects Card */}
                <div className="md:col-span-2 bg-studio-surface border border-studio-border rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-studio-border pb-2.5">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-violet-400" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                        Planned Cut Sequence ({activePlan.segments?.length || 0} clips)
                      </h3>
                    </div>
                    <span className="text-[11px] text-studio-subtle font-mono">
                      In / Out & Motion
                    </span>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {activePlan.segments?.map((seg, idx) => {
                      const segDuration = (seg.sourceOut - seg.sourceIn) / (seg.speed || 1.0);
                      const asset = mediaItems.find((m) => m.id === seg.assetId);
                      return (
                        <div
                          key={idx}
                          className="bg-studio-card border border-studio-border rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                              {idx + 1}
                            </span>
                            {asset?.isPhoto ? (
                              <ImageIcon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                            ) : (
                              <VideoIcon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="font-semibold text-white truncate block">
                                {asset?.originalName || asset?.filename || `Asset ${seg.assetId.slice(0, 6)}`}
                              </span>
                              <span className="text-[10px] text-studio-muted font-mono block">
                                {formatSimpleDuration(seg.sourceIn)} → {formatSimpleDuration(seg.sourceOut)} (
                                {segDuration.toFixed(1)}s)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {seg.motionEffect && seg.motionEffect !== 'none' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono">
                                {seg.motionEffect.replace('_', ' ')}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-studio-surface border border-studio-border text-studio-muted">
                              {seg.transition}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Audio, Captions & Silences Card */}
                <div className="bg-studio-surface border border-studio-border rounded-xl p-5 space-y-4">
                  {/* Captions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-studio-border pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-violet-400" />
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                          Captions
                        </h4>
                      </div>
                      <span className="text-[10px] text-studio-subtle font-mono">
                        {activePlan.captions?.length || 0} planned
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {activePlan.captions && activePlan.captions.length > 0 ? (
                        activePlan.captions.map((cap, cIdx) => (
                          <div
                            key={cIdx}
                            className="bg-studio-card border border-studio-border rounded p-1.5 text-[11px] text-studio-text"
                          >
                            <span className="text-[9px] font-mono text-studio-muted block">
                              {formatSimpleDuration(cap.startTime)} - {formatSimpleDuration(cap.endTime)}
                            </span>
                            <span className="truncate block font-medium">"{cap.text}"</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-studio-muted italic">No captions in this plan.</p>
                      )}
                    </div>
                  </div>

                  {/* Silences & Audio */}
                  <div className="pt-2 border-t border-studio-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                        Silence Removal
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400 font-mono">
                        {activePlan.silenceRemoval?.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    {activePlan.silenceRemoval?.removedIntervals &&
                    activePlan.silenceRemoval.removedIntervals.length > 0 ? (
                      <p className="text-[11px] text-studio-muted">
                        Trimmed {activePlan.silenceRemoval.removedIntervals.length} dead air pause(s).
                      </p>
                    ) : null}
                  </div>

                  <div className="pt-2 border-t border-studio-border space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Music className="w-3.5 h-3.5 text-blue-400" />
                        Background Music
                      </span>
                      <span className="text-[10px] text-studio-muted font-mono capitalize">
                        {activePlan.audio?.mood || 'Upbeat'}
                      </span>
                    </div>
                    <p className="text-[11px] text-studio-muted">
                      Audio ducking: {activePlan.audio?.ducking ? 'Enabled' : 'Disabled'} • Vol:{' '}
                      {Math.round((activePlan.audio?.volume || 0.2) * 100)}%
                    </p>
                  </div>
                </div>

                {/* Step 8 Feature: Auto B-Roll Cutaways Card */}
                {activePlan.bRollSegments && activePlan.bRollSegments.length > 0 && (
                  <div className="md:col-span-3 bg-studio-surface border border-studio-border rounded-xl p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-studio-border pb-2.5">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                          Auto B-Roll Cutaways ({activePlan.bRollSegments.length})
                        </h3>
                        <span className="text-[10px] text-studio-muted">
                          (Overlaid on main video • Master audio plays uninterrupted)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isRendering}
                          onClick={() => startRenderJob('draft')}
                          className="text-xs py-1 h-7"
                          leftIcon={<RefreshCw className="w-3 h-3 text-emerald-400" />}
                        >
                          Re-render with B-Roll Selection
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activePlan.bRollSegments.map((broll, bIdx) => {
                        const brollId = broll.id || `broll_${bIdx}`;
                        const isExcluded = excludedBRollIds.includes(brollId);

                        return (
                          <div
                            key={bIdx}
                            className={`p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2.5 ${
                              isExcluded
                                ? 'bg-studio-card/30 border-studio-border/40 opacity-60'
                                : 'bg-studio-card border-studio-border'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white capitalize">
                                    "{broll.keyword}"
                                  </span>
                                  {broll.stockItem?.source && (
                                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                      {broll.stockItem.source}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-studio-muted font-mono block mt-0.5">
                                  Starts at {broll.startTime.toFixed(1)}s • Duration: {broll.duration.toFixed(1)}s
                                </span>
                              </div>

                              <span
                                className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  isExcluded
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {isExcluded ? 'Excluded' : 'Active'}
                              </span>
                            </div>

                            {broll.reason && (
                              <p className="text-[11px] text-studio-muted italic">
                                "{broll.reason}"
                              </p>
                            )}

                            <div className="pt-2 border-t border-studio-border/60 flex items-center justify-between">
                              <span className="text-[10px] text-studio-muted">
                                {isExcluded ? 'Will not be rendered' : 'Cutaway over main track'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setExcludedBRollIds((prev) =>
                                    prev.includes(brollId)
                                      ? prev.filter((id) => id !== brollId)
                                      : [...prev, brollId]
                                  );
                                }}
                                className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                                  isExcluded
                                    ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                                }`}
                              >
                                {isExcluded ? 'Include in Render' : 'Remove Cutaway'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 5B Feature: Polish & Fast Re-Render Controls Panel */}
            <div className="bg-studio-surface border border-studio-border rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-studio-border pb-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-bold text-white">Video Polish & Fast Re-Render Controls</h3>
                </div>
                <span className="text-[11px] text-studio-muted">
                  Re-renders directly via FFmpeg without recalling Gemini AI
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Captions & Style */}
                <div className="bg-studio-card border border-studio-border rounded-lg p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer">
                      <FileText className="w-3.5 h-3.5 text-violet-400" />
                      <span>Captions</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={optCaptions}
                      onChange={(e) => setOptCaptions(e.target.checked)}
                      className="w-4 h-4 rounded border-studio-border bg-studio-bg text-violet-600 focus:ring-violet-500 cursor-pointer"
                    />
                  </div>
                  {optCaptions && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-studio-subtle font-semibold">Style</span>
                      <select
                        value={optCaptionStyle}
                        onChange={(e) => setOptCaptionStyle(e.target.value as any)}
                        className="w-full bg-studio-bg border border-studio-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                      >
                        <option value="viral">Viral (Active Word Highlight)</option>
                        <option value="clean">Clean (Modern Sans)</option>
                        <option value="minimal">Minimal (Subtle Box)</option>
                      </select>
                    </div>
                  )}
                  <p className="text-[10px] text-studio-subtle leading-tight">
                    Uses local faster-whisper with word timestamps + safe margins.
                  </p>
                </div>

                {/* 2. Background Music */}
                <div className="bg-studio-card border border-studio-border rounded-lg p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer">
                      <Music className="w-3.5 h-3.5 text-amber-400" />
                      <span>Background Music</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={optMusic}
                      onChange={(e) => setOptMusic(e.target.checked)}
                      className="w-4 h-4 rounded border-studio-border bg-studio-bg text-violet-600 focus:ring-violet-500 cursor-pointer"
                    />
                  </div>
                  {optMusic && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-studio-subtle font-semibold">Mood Track</span>
                      <select
                        value={optMusicMood}
                        onChange={(e) => setOptMusicMood(e.target.value)}
                        className="w-full bg-studio-bg border border-studio-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500 font-mono capitalize"
                      >
                        <option value="upbeat">Upbeat / Energetic</option>
                        <option value="calm">Calm / Ambient</option>
                        <option value="cinematic">Cinematic / Epic</option>
                        <option value="emotional">Emotional / Reflective</option>
                        <option value="corporate">Corporate / Tech</option>
                      </select>
                    </div>
                  )}
                  <p className="text-[10px] text-studio-subtle leading-tight">
                    Auto-ducked during speech via sidechain compression.
                  </p>
                </div>

                {/* 3. Brand Kit Logo */}
                <div className="bg-studio-card border border-studio-border rounded-lg p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>Brand Kit Logo</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={optBrandKit}
                      onChange={(e) => setOptBrandKit(e.target.checked)}
                      className="w-4 h-4 rounded border-studio-border bg-studio-bg text-violet-600 focus:ring-violet-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-studio-subtle leading-tight pt-1">
                    Overlays channel logo in safe zone from backend brand assets.
                  </p>
                </div>

                {/* 4. Silence Removal */}
                <div className="bg-studio-card border border-studio-border rounded-lg p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer">
                      <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Silence Removal</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={optSilenceRemoval}
                      onChange={(e) => setOptSilenceRemoval(e.target.checked)}
                      className="w-4 h-4 rounded border-studio-border bg-studio-bg text-violet-600 focus:ring-violet-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-studio-subtle leading-tight pt-1">
                    Cuts gaps &gt; 0.4s with 50ms word safety padding + audio crossfades.
                  </p>
                </div>
              </div>

              {/* Re-Render Trigger Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isRendering || isGeneratingPlan}
                  onClick={() =>
                    startRenderJob('draft', selectedPlanVersion, {
                      captions: optCaptions,
                      captionStyle: optCaptionStyle,
                      music: optMusic,
                      musicMood: optMusicMood,
                      useBrandKit: optBrandKit,
                      silenceRemoval: optSilenceRemoval,
                    })
                  }
                  leftIcon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
                >
                  Re-render Draft (720p)
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isRendering || isGeneratingPlan}
                  onClick={() =>
                    startRenderJob('final', selectedPlanVersion, {
                      captions: optCaptions,
                      captionStyle: optCaptionStyle,
                      music: optMusic,
                      musicMood: optMusicMood,
                      useBrandKit: optBrandKit,
                      silenceRemoval: optSilenceRemoval,
                    })
                  }
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  leftIcon={<RefreshCw className="w-3.5 h-3.5 text-emerald-200" />}
                >
                  Re-render with these changes (1080p)
                </Button>
              </div>
            </div>

            {/* Export Versions History */}
            {versions.length > 0 && (
              <div className="bg-studio-surface border border-studio-border rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-studio-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-violet-400" />
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Exported Final Videos ({versions.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-studio-subtle font-mono">
                    Permanent Disk Storage
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {versions.map((ver) => {
                    const isDraft =
                      ver.notes?.toLowerCase().includes('draft') ||
                      ver.filename.toLowerCase().includes('draft');
                    const isCurrentlyActive =
                      activeExport?.id === ver.id || activeExport?.filename === ver.filename;

                    return (
                      <div
                        key={ver.id}
                        className={`bg-studio-card border rounded-lg p-2.5 flex items-center justify-between gap-3 transition-colors ${
                          isCurrentlyActive
                            ? 'border-violet-500 bg-violet-950/20'
                            : 'border-studio-border hover:border-violet-500/40'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                                isDraft
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {ver.versionTag} ({isDraft ? 'DRAFT' : 'FINAL'})
                            </span>
                            <span className="text-xs font-medium text-studio-text truncate">
                              {ver.filename}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-studio-subtle font-mono mt-1">
                            <span>{formatDate(ver.createdAt)}</span>
                            <span>•</span>
                            <span>{ver.resolution || '1080p'}</span>
                            {ver.duration ? (
                              <>
                                <span>•</span>
                                <span>{formatSimpleDuration(ver.duration)}</span>
                              </>
                            ) : null}
                            {ver.fileSizeBytes ? (
                              <>
                                <span>•</span>
                                <span>{formatBytes(ver.fileSizeBytes)}</span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveExport({
                                id: ver.id,
                                versionTag: ver.versionTag,
                                publicUrl: ver.publicUrl,
                                filename: ver.filename,
                                duration: ver.duration || undefined,
                                fileSizeBytes: ver.fileSizeBytes || undefined,
                                mode: isDraft ? 'draft' : 'final',
                              });
                              setCustomVideoPreview(ver.publicUrl, ver.filename, ver.duration || undefined);
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              isCurrentlyActive
                                ? 'bg-violet-600 text-white shadow'
                                : 'bg-studio-surface border border-studio-border hover:bg-studio-card text-studio-text hover:text-white'
                            }`}
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>{isCurrentlyActive ? 'Playing' : 'Watch'}</span>
                          </button>

                          <a
                            href={apiClient.getVideoFileUrl(ver.publicUrl)}
                            download={ver.filename}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Collapsed Advanced Section */}
        <section className="pt-4 border-t border-studio-border">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen((prev) => !prev)}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-studio-surface border border-studio-border hover:border-studio-subtle hover:bg-studio-card transition-all text-left"
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-semibold text-white">
                Advanced Controls (Timeline, Style Preferences & Raw Execution)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-studio-card border border-studio-border text-studio-muted">
                Optional
              </span>
            </div>
            {isAdvancedOpen ? (
              <ChevronUp className="w-4 h-4 text-studio-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-studio-muted" />
            )}
          </button>

          {isAdvancedOpen && (
            <div className="mt-4 space-y-6 p-4 rounded-xl bg-studio-surface/50 border border-studio-border animate-in fade-in duration-200">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PromptEditor />
                <StylePreferences />
              </div>

              <div className="pt-2">
                <Timeline />
              </div>

              <div className="pt-2">
                <AIActivityPanel />
              </div>
            </div>
          )}
        </section>
      </>
    )}
  </div>

      {/* Dialogs */}
      <JobPayloadModal />
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
    </div>
  );
};
