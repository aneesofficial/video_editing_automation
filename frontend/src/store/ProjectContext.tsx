import React, { createContext, useContext, useState } from 'react';
import { Project } from '../types/project';
import { projectStorage } from '../services/projectStorage';

interface ProjectContextType {
  projects: Project[];
  getProject: (id: string) => Project | null;
  saveProject: (project: Project) => Project;
  deleteProject: (id: string) => boolean;
  duplicateProject: (id: string) => Project | null;
  refreshProjects: () => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(() => projectStorage.getAll());

  const refreshProjects = () => {
    setProjects(projectStorage.getAll());
  };

  const getProject = (id: string): Project | null => {
    return projectStorage.getById(id);
  };

  const saveProject = (project: Project): Project => {
    const saved = projectStorage.save(project);
    refreshProjects();
    return saved;
  };

  const deleteProject = (id: string): boolean => {
    const success = projectStorage.delete(id);
    if (success) {
      refreshProjects();
    }
    return success;
  };

  const duplicateProject = (id: string): Project | null => {
    const duplicated = projectStorage.duplicate(id);
    if (duplicated) {
      refreshProjects();
    }
    return duplicated;
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        getProject,
        saveProject,
        deleteProject,
        duplicateProject,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};
