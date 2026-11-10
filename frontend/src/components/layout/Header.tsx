import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { useWorkspace } from '../../store/WorkspaceContext';
import { APP_NAME } from '../../config/brand';

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileNav }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetWorkspace } = useWorkspace();

  const handleNewProjectClick = () => {
    resetWorkspace();
    navigate('/editor');
  };

  const getPageTitle = () => {
    if (location.pathname.startsWith('/editor') || location.pathname.startsWith('/workspace')) {
      return 'Editor';
    }
    if (location.pathname.startsWith('/settings')) {
      return 'Settings';
    }
    return 'Home';
  };

  return (
    <header className="h-14 border-b border-studio-border bg-studio-surface/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-20">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="p-1.5 rounded-lg text-studio-muted hover:text-white hover:bg-studio-card md:hidden transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider text-studio-muted uppercase">
            {APP_NAME}
          </span>
          <span className="text-studio-border text-xs">/</span>
          <span className="text-xs font-medium text-studio-text">
            {getPageTitle()}
          </span>
        </div>
      </div>

      {/* Right: New Project CTA */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleNewProjectClick}
        >
          New Project
        </Button>
      </div>
    </header>
  );
};
