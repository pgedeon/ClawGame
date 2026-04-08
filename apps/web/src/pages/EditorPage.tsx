import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, Play, Wrench, FileCode, Zap } from 'lucide-react';
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
  const [projectGenre, setProjectGenre] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'success' | 'error'>('idle');
  const [buildMessage, setBuildMessage] = useState<string | null>(null);
  const [aiContext, setAiContext] = useState<string>('code editor');
  const [fileCount, setFileCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjectInfo();
  }, [projectId]);

  const loadProjectInfo = async () => {
    try {
      const project = await api.getProject(projectId);
      setProjectName(project?.name || 'Unknown Project');
      setProjectGenre(project?.genre || '');
      setAiContext(project?.genre || 'code editor');

      // Count files for status display
      const tree = await api.getFileTree(projectId, '', 2);
      setFileCount(countFiles(tree));
    } catch (err) {
      logger.error('Failed to load project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const countFiles = (nodes: any[]): number => {
    let count = 0;
    for (const node of nodes) {
      if (node.type === 'file') count++;
      if (node.children) count += countFiles(node.children);
    }
    return count;
  };

  const handleBuild = async () => {
    setBuildStatus('building');
    setBuildMessage('Checking project files...');

    try {
      const tree = await api.getFileTree(projectId, '', 1);
      const totalFiles = countFiles(tree);

      if (totalFiles > 0) {
        setBuildStatus('success');
        setBuildMessage(`✅ Ready — ${totalFiles} file${totalFiles !== 1 ? 's' : ''} found`);
        setFileCount(totalFiles);
      } else {
        setBuildStatus('error');
        setBuildMessage('No files found — create a file to get started');
      }
    } catch (err: any) {
      setBuildStatus('error');
      setBuildMessage(`Build check failed: ${err.message}`);
    }

    setTimeout(() => {
      setBuildStatus('idle');
      setBuildMessage(null);
    }, 4000);
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
            {projectGenre && <span className="genre-tag">{projectGenre}</span>}
            <span className="ai-badge-inline">
              <Sparkles size={10} />
              AI-Ready
            </span>
            {fileCount > 0 && (
              <span className="file-count-tag">{fileCount} files</span>
            )}
          </p>
        </div>

        <div className="page-actions">
          {buildMessage && (
            <div className={`build-feedback ${buildStatus}`}>
              {buildStatus === 'building' && <span className="build-spinner" />}
              {buildMessage}
            </div>
          )}
          <button
            className="action-btn build"
            onClick={handleBuild}
            disabled={buildStatus === 'building'}
          >
            <Wrench size={14} />
            {buildStatus === 'building' ? 'Checking...' : 'Build'}
          </button>
          <button className="action-btn play" onClick={handlePlay}>
            <Play size={14} />
            Play
          </button>
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
