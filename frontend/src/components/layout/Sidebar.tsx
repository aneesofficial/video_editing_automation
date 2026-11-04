import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Clock,
  Sparkles,
  Palette,
  Settings,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { useSettings } from '../../store/SettingsContext';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { settings } = useSettings();
  const location = useLocation();

  const navItems = [
    {
      to: '/',
      label: 'Home / Dashboard',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      to: '/workspace',
      label: 'Editing Workspace',
      icon: Sliders,
    },
    {
      to: '/projects',
      label: 'All Projects',
      icon: FolderKanban,
    },
    {
      to: '/projects?filter=recent',
      label: 'Recent Projects',
      icon: Clock,
      isActiveCustom: location.pathname === '/projects' && location.search.includes('filter=recent'),
    },
    {
      to: '/templates',
      label: 'Templates',
      icon: Sparkles,
    },
    {
      to: '/brand-assets',
      label: 'Brand Assets',
      icon: Palette,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 h-full flex flex-col bg-studio-surface border-r border-studio-border select-none z-20">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-studio-border gap-3">
        <div className="w-9 h-9 rounded-lg bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400 shadow-accent-glow">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6L14 12L4 18V6Z" fill="#8B5CF6" />
            <path d="M14 6L20 12L14 18" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm tracking-wide text-white flex items-center gap-1.5">
            NovaCut
            <span className="text-[10px] font-mono uppercase bg-violet-500/20 text-violet-300 px-1.5 py-0.2 rounded border border-violet-500/30">
              Studio
            </span>
          </span>
          <span className="text-[11px] text-studio-muted">AI Video Workstation</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-studio-subtle uppercase tracking-wider">
          Workspace Navigation
        </div>

        {navItems.map((item) => {
          const isItemActive = item.isActiveCustom ?? (item.exact
            ? location.pathname === item.to && location.search === ''
            : location.pathname === item.to && (!item.to.includes('?') || location.search === item.to.split('?')[1]));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isItemActive
                  ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30'
                  : 'text-studio-muted hover:text-studio-text hover:bg-studio-card/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={`w-4 h-4 transition-colors ${
                    isItemActive ? 'text-violet-400' : 'text-studio-subtle group-hover:text-studio-muted'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {isItemActive && <ChevronRight className="w-3.5 h-3.5 text-violet-400" />}
            </NavLink>
          );
        })}
      </div>

      {/* Profile Area */}
      <div className="p-3 border-t border-studio-border bg-studio-surface/80">
        <NavLink
          to="/settings?tab=profile"
          onClick={onCloseMobile}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-studio-card transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-studio-card border border-studio-borderLight flex items-center justify-center font-mono text-xs font-semibold text-violet-300 group-hover:border-violet-500/50 transition-colors">
            {settings.profile.avatarInitials || 'CD'}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-studio-text truncate group-hover:text-white">
              {settings.profile.name}
            </span>
            <span className="text-[11px] text-studio-muted truncate">
              {settings.profile.workspaceName}
            </span>
          </div>
        </NavLink>
      </div>
    </aside>
  );
};
