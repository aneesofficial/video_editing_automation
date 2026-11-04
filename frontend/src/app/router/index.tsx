import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { DashboardPage } from '../../features/dashboard/DashboardPage';
import { WorkspacePage } from '../../features/workspace/WorkspacePage';
import { ProjectsPage } from '../../features/projects/ProjectsPage';
import { TemplatesPage } from '../../features/templates/TemplatesPage';
import { BrandAssetsPage } from '../../features/brand/BrandAssetsPage';
import { SettingsPage } from '../../features/settings/SettingsPage';
import { NotFoundPage } from '../../components/layout/NotFoundPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="workspace" element={<WorkspacePage />} />
        <Route path="workspace/:projectId" element={<WorkspacePage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<WorkspacePage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="brand-assets" element={<BrandAssetsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

