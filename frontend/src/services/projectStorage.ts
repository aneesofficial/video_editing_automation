import { Project } from '../types/project';

const STORAGE_KEY = 'novacut_projects_v1';

export const projectStorage = {
  getAll(): Project[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to load projects from storage:', e);
      return [];
    }
  },

  getById(id: string): Project | null {
    const projects = this.getAll();
    return projects.find((p) => p.id === id) || null;
  },

  save(project: Project): Project {
    const projects = this.getAll();
    const existingIndex = projects.findIndex((p) => p.id === project.id);
    const now = new Date().toISOString();

    const updatedProject = {
      ...project,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      projects[existingIndex] = updatedProject;
    } else {
      projects.unshift(updatedProject);
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save project to storage:', e);
    }

    return updatedProject;
  },

  delete(id: string): boolean {
    try {
      const projects = this.getAll();
      const filtered = projects.filter((p) => p.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.error('Failed to delete project:', e);
      return false;
    }
  },

  duplicate(id: string): Project | null {
    const original = this.getById(id);
    if (!original) return null;

    const newId = `prj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const duplicate: Project = {
      ...original,
      id: newId,
      title: `${original.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
    };

    return this.save(duplicate);
  },

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};

