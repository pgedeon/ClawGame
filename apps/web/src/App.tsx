import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { CreateProjectPage } from './pages/CreateProjectPage';
import { OpenProjectPage } from './pages/OpenProjectPage';
import { ExamplesPage } from './pages/ExamplesPage';
import { ProjectPage } from './pages/ProjectPage';
import { EditorPage } from './pages/EditorPage';
import { AICommandPage } from './pages/AICommandPage';
import { AssetStudioPage } from './pages/AssetStudioPage';
import { SettingsPage } from './pages/SettingsPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="create-project" element={<CreateProjectPage />} />
          <Route path="open-project" element={<OpenProjectPage />} />
          <Route path="examples" element={<ExamplesPage />} />
          <Route path="project/:projectId" element={<ProjectPage />} />
          <Route path="project/:projectId/editor" element={<EditorPage />} />
          <Route path="project/:projectId/ai" element={<AICommandPage />} />
          <Route path="project/:projectId/assets" element={<AssetStudioPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;