import React, { useState, useMemo } from 'react';
import { Copy, Check, Code2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useWorkspace } from '../../store/WorkspaceContext';
import { AIPromptPayload } from '../../types/ai';

export const JobPayloadModal: React.FC = () => {
  const {
    isPayloadModalOpen,
    setIsPayloadModalOpen,
    prompt,
    promptTags,
    getPreferencesSnapshot,
    videoMetadata,
    currentProjectId,
    projectTitle,
    duration,
  } = useWorkspace();

  const [copied, setCopied] = useState(false);

  const payload: AIPromptPayload & { projectTitle: string; activeRules: string[] } = useMemo(() => {
    return {
      projectId: currentProjectId || 'draft_preview',
      projectTitle,
      userPrompt: prompt || '(No freeform prompt entered)',
      activeRules: promptTags,
      preferences: getPreferencesSnapshot(),
      sourceVideoName: videoMetadata?.name || 'No video loaded',
      sourceDurationSeconds: duration,
      sourceResolution: {
        width: videoMetadata?.width || 1920,
        height: videoMetadata?.height || 1080,
      },
      clientTimestamp: 'client_local_state',
    };
  }, [currentProjectId, projectTitle, prompt, promptTags, getPreferencesSnapshot, videoMetadata, duration]);

  const jsonString = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isPayloadModalOpen}
      onClose={() => setIsPayloadModalOpen(false)}
      title="AI Editing Job Payload Inspector"
      description="Exact JSON schema payload prepared for transmission to the NovaCut AI Backend Service."
      maxWidth="2xl"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={() => setIsPayloadModalOpen(false)}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCopy}
            leftIcon={copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? 'Copied to Clipboard' : 'Copy JSON'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 bg-studio-surface border border-studio-border rounded-lg text-xs text-studio-muted">
          <Code2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <span>
            This structured request object will be dispatched via <code>POST /api/v1/ai/generate-cut</code> upon Phase 2 backend connection.
          </span>
        </div>

        <div className="relative bg-[#07080b] border border-studio-border rounded-lg p-3.5 max-h-[380px] overflow-auto">
          <pre className="font-mono text-xs text-violet-300 leading-relaxed">
            {jsonString}
          </pre>
        </div>
      </div>
    </Modal>
  );
};
