import React from 'react';
import { Search, LayoutGrid, List, ArrowUpDown, Building } from 'lucide-react';
import { AspectRatio } from '../../types/video';
import { ProjectStatus, Client } from '../../types/project';

interface ProjectFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  clientFilter?: string;
  onClientFilterChange?: (clientId: string) => void;
  clients?: Client[];
  statusFilter: ProjectStatus | 'all';
  onStatusFilterChange: (status: ProjectStatus | 'all') => void;
  aspectRatioFilter: AspectRatio | 'all';
  onAspectRatioFilterChange: (ar: AspectRatio | 'all') => void;
  sortBy: 'updated' | 'created' | 'title';
  onSortByChange: (sort: 'updated' | 'created' | 'title') => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  searchQuery,
  onSearchChange,
  clientFilter = 'all',
  onClientFilterChange,
  clients = [],
  statusFilter,
  onStatusFilterChange,
  aspectRatioFilter,
  onAspectRatioFilterChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-studio-surface border border-studio-border rounded-xl p-3">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="w-4 h-4 text-studio-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search projects by title, client, or prompt..."
          className="w-full bg-studio-card border border-studio-border text-studio-text placeholder-studio-subtle text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-violet-500/80 transition-colors"
        />
      </div>

      {/* Filters and View Toggles */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Client Filter */}
        {onClientFilterChange && (
          <div className="flex items-center gap-1 bg-studio-card border border-studio-border rounded-lg px-2 py-1">
            <Building className="w-3.5 h-3.5 text-studio-subtle" />
            <select
              value={clientFilter}
              onChange={(e) => onClientFilterChange(e.target.value)}
              className="bg-transparent text-studio-muted text-xs focus:outline-none border-none pr-1"
            >
              <option value="all" className="bg-studio-card text-studio-text">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-studio-card text-studio-text">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as ProjectStatus | 'all')}
          className="bg-studio-card border border-studio-border text-studio-muted text-xs rounded-lg px-2.5 py-2 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Drafts</option>
          <option value="ready">Ready</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
        </select>

        {/* Aspect Ratio Filter */}
        <select
          value={aspectRatioFilter}
          onChange={(e) => onAspectRatioFilterChange(e.target.value as AspectRatio | 'all')}
          className="bg-studio-card border border-studio-border text-studio-muted text-xs rounded-lg px-2.5 py-2 focus:outline-none"
        >
          <option value="all">All Aspect Ratios</option>
          <option value="16:9">16:9 Landscape</option>
          <option value="9:16">9:16 Vertical</option>
          <option value="1:1">1:1 Square</option>
          <option value="4:5">4:5 Portrait</option>
          <option value="21:9">21:9 Cinematic</option>
        </select>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-1 bg-studio-card border border-studio-border rounded-lg px-2 py-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-studio-subtle" />
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as 'updated' | 'created' | 'title')}
            className="bg-transparent text-studio-muted text-xs focus:outline-none border-none pr-1"
          >
            <option value="updated" className="bg-studio-card text-studio-text">Recently Modified</option>
            <option value="created" className="bg-studio-card text-studio-text">Date Created</option>
            <option value="title" className="bg-studio-card text-studio-text">Project Title</option>
          </select>
        </div>

        {/* Grid / List Mode Toggle */}
        <div className="flex items-center bg-studio-card border border-studio-border rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'grid'
                ? 'bg-studio-surface text-white shadow-studio-sm'
                : 'text-studio-muted hover:text-studio-text'
              }`}
            title="Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'list'
                ? 'bg-studio-surface text-white shadow-studio-sm'
                : 'text-studio-muted hover:text-studio-text'
              }`}
            title="List View"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
