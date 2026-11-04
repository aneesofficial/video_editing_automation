import React, { useState } from 'react';
import { Save, Download, Code2, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { VideoUploader } from '../../components/video/VideoUploader';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { PromptEditor } from '../../components/editor/PromptEditor';
import { StylePreferences } from '../../components/editor/StylePreferences';
import { Timeline } from '../../components/editor/Timeline';
import { AIActivityPanel } from '../../components/editor/AIActivityPanel';
import { JobPayloadModal } from '../../components/editor/JobPayloadModal';
import { ExportModal } from '../../components/editor/ExportModal';
import { useWorkspace } from '../../store/WorkspaceContext';
import { useProjects } from '../../store/ProjectContext';

export const WorkspacePage: React.FC = () => {
  const {
    projectTitle,
    setProjectTitle,
    isDirty,
    videoMetadata,
    prompt,
    promptTags,
    getPreferencesSnapshot,
    duration,
    currentProjectId,
    setIsPayloadModalOpen,
  } = useWorkspace();

  const { saveProject } = useProjects();
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleSaveProject = () => {
    const id = currentProjectId || `prj_${Date.now()}`;
    const now = new Date().toISOString();

    saveProject({
      id,
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

    setSaveSuccessMessage('Saved locally');
    setTimeout(() => setSaveSuccessMessage(null), 2500);
  };

  return (
    <div className="flex flex-col min-h-full pb-12">
      {/* Top Workspace Bar */}
      <div className="bg-studio-surface border-b border-studio-border px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            placeholder="Untitled Project"
            className="text-sm font-semibold bg-transparent border border-transparent hover:border-studio-border focus:border-violet-500 rounded px-2 py-1 text-white focus:outline-none transition-colors max-w-xs sm:max-w-sm truncate"
          />

          {saveSuccessMessage ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
              <Check className="w-3.5 h-3.5" />
              <span>{saveSuccessMessage}</span>
            </span>
          ) : isDirty ? (
            <span className="text-[11px] text-amber-400 font-mono">
              • Unsaved changes
            </span>
          ) : (
            <span className="text-[11px] text-studio-subtle font-mono hidden sm:inline">
              Saved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPayloadModalOpen(true)}
            leftIcon={<Code2 className="w-3.5 h-3.5 text-violet-400" />}
            title="Inspect formatted AI prompt & preferences payload"
          >
            Payload
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSaveProject}
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

      {/* Main Workspace Body */}
      <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (Video Ingestion, Player, and AI Activity): 7 Cols on LG */}
          <div className="lg:col-span-7 space-y-6">
            <VideoUploader />
            <VideoPlayer />
            <AIActivityPanel />
          </div>

          {/* Right Column (Prompt Directives and Preferences): 5 Cols on LG */}
          <div className="lg:col-span-5 space-y-6">
            <PromptEditor />
            <StylePreferences />
          </div>
        </div>

        {/* Lower Multi-Track Timeline (Full Width) */}
        <div className="pt-2">
          <Timeline />
        </div>
      </div>

      {/* Dialogs */}
      <JobPayloadModal />
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};

