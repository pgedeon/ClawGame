import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OnboardingTour } from './components/OnboardingTour';
import { NotFoundPage } from './pages/NotFoundPage';
import { DashboardPage } from './pages/DashboardPage';
import { CreateProjectPage } from './pages/CreateProjectPage';
import { OpenProjectPage } from './pages/OpenProjectPage';
import { ExamplesPage } from './pages/ExamplesPage';
import { SettingsPage } from './pages/SettingsPage';

// Import CSS files
import './error-boundary.css';
import './onboarding.css';
import './game-hub.css';
import './game-preview.css';
import './asset-studio.css';
import './export-page.css';

// Lazy-loaded pages (code-split for smaller initial bundle)
const ProjectPage = lazy(() => import('./pages/ProjectPage').then(m => ({ default: m.ProjectPage })));
const EditorPage = lazy(() => import('./pages/EditorPage').then(m => ({ default: m.EditorPage })));
const SceneEditorPage = lazy(() => import('./pages/SceneEditorPage').then(m => ({ default: m.SceneEditorPage })));
const AICommandPage = lazy(() => import('./pages/AICommandPage').then(m => ({ default: m.AICommandPage })));
const AssetStudioPage = lazy(() => import('./pages/AssetStudioPage').then(m => ({ default: m.AssetStudioPage })));
const GamePreviewPage = lazy(() => import('./pages/GamePreviewPage').then(m => ({ default: m.GamePreviewPage })));
const ExportPage = lazy(() => import('./pages/ExportPage').then(m => ({ default: m.ExportPage })));

function PageLoader() {
  return (
    <div className="loading" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
      <div className="build-spinner" style={{ margin: '0 auto 1rem' }} />
      Loading...
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <OnboardingTour />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="create-project" element={<CreateProjectPage />} />
            <Route path="open-project" element={<OpenProjectPage />} />
            <Route path="examples" element={<ExamplesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="project/:projectId" element={
              <Suspense fallback={<PageLoader />}>
                <ProjectPage />
              </Suspense>
            } />
            <Route path="project/:projectId/editor" element={
              <Suspense fallback={<PageLoader />}>
                <EditorPage />
              </Suspense>
            } />
            <Route path="project/:projectId/scene-editor" element={
              <Suspense fallback={<PageLoader />}>
                <SceneEditorPage />
              </Suspense>
            } />
            <Route path="project/:projectId/ai" element={
              <Suspense fallback={<PageLoader />}>
                <AICommandPage />
              </Suspense>
            } />
            <Route path="project/:projectId/assets" element={
              <Suspense fallback={<PageLoader />}>
                <AssetStudioPage />
              </Suspense>
            } />
            <Route path="project/:projectId/preview" element={
              <Suspense fallback={<PageLoader />}>
                <GamePreviewPage />
              </Suspense>
            } />
            <Route path="project/:projectId/export" element={
              <Suspense fallback={<PageLoader />}>
                <ExportPage />
              </Suspense>
            } />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
