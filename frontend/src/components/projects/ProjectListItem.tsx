import React, { useState } from 'react';
import { Film, MoreVertical, Copy, Trash2 } from 'lucide-react';
import { Project } from '../../types/project';
import { formatDate } from '../../utils/formatters';
import { Badge, BadgeVariant } from '../ui/Badge';

interface ProjectListItemProps {
  project: Project;
  onOpen: (project: Project) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ProjectListItem: React.FC<ProjectListItemProps> = ({
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

  return (
    <div
      onClick={() => onOpen(project)}
      className="group bg-studio-surface border border-studio-border hover:border-violet-500/50 rounded-lg p-3 sm:px-4 flex items-center justify-between gap-4 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-lg bg-studio-card border border-studio-border flex items-center justify-center text-violet-400 flex-shrink-0 group-hover:border-violet-500/40">
          <Film className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-studio-text group-hover:text-white truncate">
              {project.title}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-studio-card text-studio-subtle border border-studio-border">
              {project.preferences?.aspectRatio || '16:9'}
            </span>
          </div>
          <p className="text-xs text-studio-muted truncate max-w-md mt-0.5">
            {project.rawPrompt || 'No prompt instructions'}
          </p>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6 text-xs text-studio-muted">
        <span className="capitalize">{project.preferences?.style || 'standard'}</span>
        <span className="font-mono text-studio-subtle">{formatDate(project.updatedAt)}</span>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={statusBadge.variant} size="sm">
          {statusBadge.label}
        </Badge>

        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded text-studio-muted hover:text-white hover:bg-studio-card transition-colors"
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
    </div>
  );
};
