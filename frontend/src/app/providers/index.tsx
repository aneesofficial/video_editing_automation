import React from 'react';
import { SettingsProvider } from '../../store/SettingsContext';
import { ProjectProvider } from '../../store/ProjectContext';
import { WorkspaceProvider } from '../../store/WorkspaceContext';

export interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <SettingsProvider>
      <ProjectProvider>
        <WorkspaceProvider>
          {children}
        </WorkspaceProvider>
      </ProjectProvider>
    </SettingsProvider>
  );
};

