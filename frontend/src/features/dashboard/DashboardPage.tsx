import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Film, FolderKanban, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProjectCard } from '../../components/projects/ProjectCard';
import { NewProjectModal } from '../../components/projects/NewProjectModal';
import { QuickUploadBanner } from './QuickUploadBanner';
import { OnboardingGuidance } from './OnboardingGuidance';
import { useProjects } from '../../store/ProjectContext';
import { useWorkspace } from '../../store/WorkspaceContext';
import { useSettings } from '../../store/SettingsContext';
import { Project } from '../../types/project';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, deleteProject, duplicateProject } = useProjects();
  const { loadProjectData, resetWorkspace, loadVideoFile } = useWorkspace();
  const { settings } = useSettings();

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  const handleOpenProject = (project: Project) => {
    loadProjectData(project);
    navigate('/workspace');
  };

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      resetWorkspace();
      const success = await loadVideoFile(files[0]);
      if (success) {
        navigate('/workspace');
      }
    }
  };

  const recentProjects = [...projects].slice(0, 4);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* 1. Welcome Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-studio-border pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {settings.profile.name ? `Welcome back, ${settings.profile.name.split(' ')[0]}` : 'Welcome to NovaCut Studio'}
          </h2>
          <p className="text-xs text-studio-muted mt-1">
            NovaCut AI Video Production Workstation • Automated editing & sequence assembly.
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

      {/* 2. Quick Upload Banner */}
      <QuickUploadBanner
        onFileSelect={handleQuickUpload}
        onOpenWorkspace={() => {
          resetWorkspace();
          navigate('/workspace');
        }}
      />

      {/* 3. Recent Projects */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-violet-400" />
            <h3 className="text-base font-semibold text-studio-text">Recent Projects</h3>
          </div>
          {projects.length > 0 && (
            <button
              onClick={() => navigate('/projects')}
              className="text-xs font-medium text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              <span>View All ({projects.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentProjects.map((project) => (
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
          <EmptyState
            icon={Film}
            title="No Video Projects Yet"
            description="Create your first video editing project or import raw media footage to start drafting AI-directed cut sequences."
            actionLabel="Create First Project"
            onAction={() => setIsNewProjectModalOpen(true)}
            secondaryActionLabel="Explore Templates"
            onSecondaryAction={() => navigate('/templates')}
          />
        )}
      </div>

      {/* 4. Onboarding Guidance */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-studio-muted">Studio Workflow Guidance</h3>
        <OnboardingGuidance />
      </div>

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
      />
    </div>
  );
};

