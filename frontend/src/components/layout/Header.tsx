import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Plus, Server, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Breadcrumbs } from '../navigation/Breadcrumbs';
import { useSettings } from '../../store/SettingsContext';
import { useWorkspace } from '../../store/WorkspaceContext';

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileNav }) => {
  const navigate = useNavigate();
  const { settings, testBackendConnection, isTestingConnection } = useSettings();
  const { resetWorkspace } = useWorkspace();

  const handleNewProjectClick = () => {
    resetWorkspace();
    navigate('/workspace');
  };

  const backendStatus = settings.backendConfig.status;

  return (
    <header className="h-16 border-b border-studio-border bg-studio-surface/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-20">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="p-2 rounded-lg text-studio-muted hover:text-white hover:bg-studio-card md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Breadcrumbs />
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Backend Status */}
        <div
          onClick={() => navigate('/settings?tab=backend')}
          className="cursor-pointer group flex items-center gap-2 bg-studio-card hover:bg-studio-cardHover border border-studio-border px-3 py-1.5 rounded-lg transition-colors"
          title="Click to view AI Engine connection status in Settings"
        >
          <Server className="w-3.5 h-3.5 text-studio-muted group-hover:text-studio-text" />
          <div className="hidden lg:flex items-center gap-1.5 text-xs">
            <span className="text-studio-muted">AI Engine:</span>
            {backendStatus === 'connected' ? (
              <Badge variant="emerald" size="sm" dot>Connected</Badge>
            ) : backendStatus === 'checking' ? (
              <Badge variant="amber" size="sm" dot>Checking...</Badge>
            ) : (
              <Badge variant="neutral" size="sm" dot>Offline (Local Mode)</Badge>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              testBackendConnection();
            }}
            disabled={isTestingConnection}
            className="text-studio-subtle hover:text-studio-text ml-1"
            title="Refresh backend status"
          >
            <RefreshCw className={`w-3 h-3 ${isTestingConnection ? 'animate-spin text-violet-400' : ''}`} />
          </button>
        </div>

        {/* Primary CTA */}
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
