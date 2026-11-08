import React, { useState } from 'react';
import {
  Film,
  MoreVertical,
  Play,
  Copy,
  Trash2,
  Calendar,
  Building,
} from 'lucide-react';
import { Project } from '../../types/project';
import { formatDate, formatSimpleDuration } from '../../utils/formatters';
import { Badge, BadgeVariant } from '../ui/Badge';

interface ProjectCardProps {
  project: Project;
  onOpen: (project: Project) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onOpen,
  onDuplicate,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusBadge = (status: Project['status']): { label: string; variant: BadgeVariant } => {
    switch (status) {
      case 'completed': return { label: 'Completed', variant: 'emerald' };
      case 'processing': return { label: 'Processing', variant: 'amber' };
      case 'ready': return { label: 'Ready', variant: 'violet' };
      case 'draft':
      default: return { label: 'Draft', variant: 'neutral' };
    }
  };

  const statusBadge = getStatusBadge(project.status);
  const clientName = project.client?.name || project.clientName || 'General';
  const latestVersion = project.versions?.[0]?.versionTag;

  return (
    <div
      onClick={() => onOpen(project)}
      className="group relative bg-studio-surface border border-studio-border hover:border-violet-500/50 rounded-xl overflow-hidden flex flex-col transition-all duration-200 cursor-pointer shadow-studio hover:shadow-studio-lg hover:-translate-y-0.5"
    >
      <div className="relative aspect-video w-full bg-[#0d0e14] border-b border-studio-border flex items-center justify-center overflow-hidden">
        {project.thumbnailUrl ? (
          <img src={project.thumbnailUrl} alt={project.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center text-studio-subtle group-hover:text-violet-400 transition-colors">
            <Film className="w-8 h-8 mb-1" />
            <span className="text-[11px] font-mono">
              {project.preferences?.aspectRatio || '16:9'}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-violet-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
            <Play className="w-4 h-4 ml-0.5" />
          </div>
        </div>

        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white border border-white/10">
            {project.preferences?.aspectRatio || '16:9'}
          </span>
          {latestVersion && (
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {latestVersion}
            </span>
          )}
        </div>

        <div className="absolute top-2.5 right-2.5">
          <Badge variant={statusBadge.variant} size="sm">
            {statusBadge.label}
          </Badge>
        </div>

        {project.durationSeconds !== undefined && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[10px] text-white">
            {formatSimpleDuration(project.durationSeconds)}
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Client indicator */}
          <div className="flex items-center gap-1 text-[11px] font-medium text-violet-400 mb-1 truncate">
            <Building className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{clientName}</span>
          </div>

          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-studio-text group-hover:text-white transition-colors truncate">
              {project.title}
            </h4>

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded text-studio-muted hover:text-white hover:bg-studio-card transition-colors"
                aria-label="Project actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-6 w-36 bg-studio-card border border-studio-borderLight rounded-lg shadow-studio-lg py-1 z-30">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDuplicate(project.id);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-studio-muted hover:text-white hover:bg-studio-surface text-left"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplicate</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDelete(project.id);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="text-xs text-studio-muted line-clamp-2 mt-1">
            {project.rawPrompt || project.description || 'No custom prompt instructions.'}
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-studio-subtle pt-2 border-t border-studio-border/60">
          <span className="flex items-center gap-1 font-mono">
            <Calendar className="w-3 h-3" />
            {formatDate(project.updatedAt)}
          </span>
          <span className="capitalize text-violet-400 font-medium">
            {project.preferences?.style || 'standard'}
          </span>
        </div>
      </div>
    </div>
  );
};
