import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const { projectTitle } = useWorkspace();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/workspace')) return `Workspace • ${projectTitle}`;
    if (path === '/projects') {
      return location.search.includes('filter=recent') ? 'Recent Projects' : 'All Projects';
    }
    if (path.startsWith('/projects/')) return 'Project Details';
    if (path === '/templates') return 'Templates & Formulas';
    if (path === '/brand-assets') return 'Brand Assets & Styling';
    if (path === '/settings') return 'Settings & Engine Configuration';
    return 'Studio';
  };

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="font-semibold text-studio-text hidden sm:inline">NovaCut</span>
      <ChevronRight className="w-3.5 h-3.5 text-studio-subtle hidden sm:inline" />
      <span className="font-medium text-studio-muted">{getPageTitle()}</span>
    </div>
  );
};

