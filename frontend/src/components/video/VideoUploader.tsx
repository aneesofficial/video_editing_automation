import React, { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, Film, AlertCircle, RefreshCw } from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import { formatBytes, formatSimpleDuration } from '../../utils/formatters';
import { Button } from '../ui/Button';

export const VideoUploader: React.FC = () => {
  const {
    videoMetadata,
    isLoadingMedia,
    mediaError,
    loadVideoFile,
    loadSampleVideo,
    clearVideo,
  } = useWorkspace();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await loadVideoFile(files[0]);
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await loadVideoFile(files[0]);
      e.target.value = '';
    }
  };

  if (videoMetadata) {
    return (
      <div className="bg-studio-surface border border-studio-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-violet-600/10 border border-violet-500/30 flex items-center justify-center text-violet-400 flex-shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-studio-text truncate">{videoMetadata.name}</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Ready
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-studio-muted mt-0.5 font-mono">
              <span>{formatBytes(videoMetadata.sizeBytes)}</span>
              <span>•</span>
              <span>{formatSimpleDuration(videoMetadata.durationSeconds)}</span>
              <span>•</span>
              <span>{videoMetadata.width}×{videoMetadata.height}</span>
              <span>•</span>
              <span>{videoMetadata.type || 'video/mp4'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Replace Video
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearVideo}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
          >
            Remove
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-violet-500 bg-violet-600/10 scale-[0.99]'
            : 'border-studio-border hover:border-violet-500/50 hover:bg-studio-surface/60 bg-studio-surface/30'
        }`}
      >
        <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-studio-card border border-studio-border flex items-center justify-center text-violet-400 shadow-studio-sm">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-studio-text">
              Drag & Drop your raw video clip here
            </h4>
            <p className="text-xs text-studio-muted mt-1 leading-relaxed">
              Supports MP4, WebM, MOV, and MKV files up to 2 GB for real in-browser playback.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isLoadingMedia}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Browse Files
            </Button>

            <span className="text-xs text-studio-subtle">or</span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                loadSampleVideo();
              }}
              title="Load a high-definition sample clip for quick test"
            >
              Load Sample Video
            </Button>
          </div>
        </div>
      </div>

      {mediaError && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{mediaError}</span>
        </div>
      )}
    </div>
  );
};
