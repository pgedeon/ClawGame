import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { FileWorkspace } from '../components/FileWorkspace';
import '../file-workspace.css';

interface EditorPageProps {
  projectId: string;
}

function EditorPageContent({ projectId }: EditorPageProps) {
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjectInfo();
  }, [projectId]);

  const loadProjectInfo = async () => {
    try {
      const project = await api.getProject(projectId);
      setProjectName(project?.name || 'Unknown Project');
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="editor-page">
        <div className="loading">Loading project...</div>
      </div>
    );
  }

  return (
    <div className="editor-page">
      <header className="page-header">
        <div className="project-info">
          <h1>Code Workspace</h1>
          <p>Project: <span className="project-name">{projectName}</span></p>
        </div>
        
        <div className="page-actions">
          <button className="action-btn">🏗️ Build</button>
          <button className="action-btn">🎮 Play</button>
          <button className="action-btn">📤 Export</button>
        </div>
      </header>
      
      <FileWorkspace projectId={projectId} />
    </div>
  );
}

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return (
      <div className="editor-page">
        <div className="error">
          <h2>No Project Selected</h2>
          <p>Please open a project first to access the code workspace.</p>
        </div>
      </div>
    );
  }

  return <EditorPageContent projectId={projectId} />;
}
