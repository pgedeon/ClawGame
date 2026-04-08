import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { FileWorkspace } from '../components/FileWorkspace';
import { ContextualAIAssistant } from '../components/ContextualAIAssistant';
import '../contextual-ai.css';
import { logger } from '../utils/logger';

interface EditorPageProps {
  projectId: string;
}

function EditorPageContent({ projectId }: EditorPageProps) {
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'success' | 'error'>('idle');
  const [buildMessage, setBuildMessage] = useState<string | null>(null);
  const [aiContext, setAiContext] = useState<string>('code editor');
  const navigate = useNavigate();

  useEffect(() => {
    loadProjectInfo();
  }, [projectId]);

  const loadProjectInfo = async () => {
    try {
      const project = await api.getProject(projectId);
      setProjectName(project?.name || 'Unknown Project');
      setAiContext(project?.genre || 'code editor');
    } catch (err) {
      logger.error('Failed to load project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuild = async () => {
    setBuildStatus('building');
    setBuildMessage('Building project...');

    // Simulate build process
    // In a real implementation, this would call a build API endpoint
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // Check that project files are accessible as a basic "build" check
      const tree = await api.getFileTree(projectId, '', 1);
      if (tree && tree.length > 0) {
        setBuildStatus('success');
        setBuildMessage(`Build successful — ${tree.length} items found`);
      } else {
        setBuildStatus('error');
        setBuildMessage('Build failed — no files found in project');
      }
    } catch (err: any) {
      setBuildStatus('error');
      setBuildMessage(`Build failed: ${err.message}`);
    }

    // Clear after 5 seconds
    setTimeout(() => {
      setBuildStatus('idle');
      setBuildMessage(null);
    }, 5000);
  };

  const handlePlay = () => {
    navigate(`/project/${projectId}/preview`);
  };

  if (isLoading) {
    return (
      <div className="editor-page">
        <div className="loading">
          <div className="loading-spinner" />
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-page">
      <header className="page-header">
        <div className="project-info">
          <h1>Code Workspace</h1>
          <p>Project: <span className="project-name">{projectName}</span>
            <span className="ai-badge-inline">
              <Sparkles size={10} />
              AI-Ready
            </span>
          </p>
        </div>

        <div className="page-actions">
          {buildMessage && (
            <div className={`build-feedback ${buildStatus}`}>
              {buildStatus === 'building' && <span className="build-spinner" />}
              {buildStatus === 'success' && '✅ '}
              {buildStatus === 'error' && '❌ '}
              {buildMessage}
            </div>
          )}
          <button
            className="action-btn build"
            onClick={handleBuild}
            disabled={buildStatus === 'building'}
          >
            {buildStatus === 'building' ? '⏳ Building...' : '🏗️ Build'}
          </button>
          <button className="action-btn play" onClick={handlePlay}>
            ▶️ Play
          </button>
          <button className="action-btn" onClick={() => navigate(`/project/${projectId}/export`)}>📤 Export</button>
        </div>
      </header>

      {/* AI Assistant Bar */}
      <div className="editor-ai-bar">
        <ContextualAIAssistant
          projectId={projectId}
          context={aiContext}
          currentFile={undefined}
        />
        <div className="editor-ai-shortcuts">
          <kbd>⌘K</kbd> <span>for full AI commands</span>
        </div>
      </div>

      <FileWorkspace projectId={projectId} />
    </div>
  );
}

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return (
      <div className="editor-page">
        <div className="error-state">
          <div className="error-icon">📁</div>
          <h2>No Project Selected</h2>
          <p>Please open a project first to access the code workspace.</p>
          <button className="action-btn" onClick={() => window.history.back()}>
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return <EditorPageContent projectId={projectId} />;
}