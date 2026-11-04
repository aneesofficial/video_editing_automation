import React from 'react';
import { UploadCloud, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface QuickUploadBannerProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenWorkspace: () => void;
}

export const QuickUploadBanner: React.FC<QuickUploadBannerProps> = ({
  onFileSelect,
  onOpenWorkspace,
}) => {
  return (
    <div className="relative rounded-2xl bg-gradient-to-r from-violet-950/40 via-studio-card to-studio-surface border border-violet-500/30 p-6 md:p-8 overflow-hidden shadow-studio">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Prompt-Directed Video Assembly</span>
          </div>
          <h3 className="text-xl font-semibold text-white">
            Upload raw video footage to begin
          </h3>
          <p className="text-xs text-studio-muted leading-relaxed">
            Ingest MP4, MOV, or WebM clips for instant local preview. Direct cut pacing, captions, and silence trimming with natural language.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
              onChange={onFileSelect}
              className="hidden"
            />
            <span className="inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg select-none text-sm px-4 py-2.5 gap-2 bg-violet-600 hover:bg-violet-500 text-white shadow-studio-sm border border-violet-500/50">
              <UploadCloud className="w-4 h-4" />
              Upload Raw Footage
            </span>
          </label>

          <Button
            variant="secondary"
            size="md"
            onClick={onOpenWorkspace}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Open Workspace
          </Button>
        </div>
      </div>
    </div>
  );
};

