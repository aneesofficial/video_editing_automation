import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Film, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProjectCard } from '../../components/projects/ProjectCard';
import { ProjectListItem } from '../../components/projects/ProjectListItem';
import { ProjectFilters } from '../../components/projects/ProjectFilters';
import { NewProjectModal } from '../../components/projects/NewProjectModal';
import { useProjects } from '../../store/ProjectContext';
import { useWorkspace } from '../../store/WorkspaceContext';
import { Project, ProjectStatus } from '../../types/project';
import { AspectRatio } from '../../types/video';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');

  const { projects, deleteProject, duplicateProject } = useProjects();
  const { loadProjectData } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [aspectRatioFilter, setAspectRatioFilter] = useState<AspectRatio | 'all'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  const handleOpenProject = (project: Project) => {
    loadProjectData(project);
    navigate('/workspace');
  };

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    if (filterParam === 'recent') {
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.rawPrompt.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (aspectRatioFilter !== 'all') {
      result = result.filter((p) => p.preferences?.aspectRatio === aspectRatioFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }, [projects, searchQuery, statusFilter, aspectRatioFilter, sortBy, filterParam]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-studio-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {filterParam === 'recent' ? 'Recent Projects' : 'All Projects'}
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-studio-surface border border-studio-border text-studio-muted">
              {filteredProjects.length}
            </span>
          </div>
          <p className="text-xs text-studio-muted mt-1">
            Organize, search, and manage your AI video editing projects and timelines.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewProjectModalOpen(true)}
        >
          New Project
        </Button>
      </div>

      {/* Filters & Search */}
      <ProjectFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        aspectRatioFilter={aspectRatioFilter}
        onAspectRatioFilterChange={setAspectRatioFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Grid or List */}
      {filteredProjects.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={handleOpenProject}
                onDuplicate={duplicateProject}
                onDelete={deleteProject}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProjects.map((project) => (
              <ProjectListItem
                key={project.id}
                project={project}
                onOpen={handleOpenProject}
                onDuplicate={duplicateProject}
                onDelete={deleteProject}
              />
            ))}
          </div>
        )
      ) : projects.length === 0 ? (
        <EmptyState
          icon={Film}
          title="No Projects Stored"
          description="You haven't saved any video editing projects yet. Start by initializing a new project or uploading video footage in the workspace."
          actionLabel="Create Project"
          onAction={() => setIsNewProjectModalOpen(true)}
        />
      ) : (
        <EmptyState
          icon={Search}
          title="No Matching Projects Found"
          description={`No projects matched the search query "${searchQuery}" with the active filters.`}
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setStatusFilter('all');
            setAspectRatioFilter('all');
          }}
        />
      )}

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
      />
    </div>
  );
};

