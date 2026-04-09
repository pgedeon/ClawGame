/**
 * @clawgame/web - File Workspace Component
 *
 * FileWorkspace provides a complete code editing environment:
 * - File tree navigation (left sidebar)
 * - CodeMirror-based editor (main content area)
 * - File/folder creation dialogs
 * - Search functionality
 * - Quick start templates
 *
 * Fixed in v0.13.5:
 * - Fixed loading state for initial file load (separate from save state)
 * - Fixed editor not showing content on file selection
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileTree } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { api, type FileNode } from '../api/client';
import { useToast } from './Toast';
import {
  FolderOpen, FileText, Settings, Code, Sparkles,
} from 'lucide-react';
import { logger } from '../utils/logger';

interface FileWorkspaceProps {
  projectId: string;
  projectType?: 'scene-based' | 'asset-based' | 'code-only';
  className?: string;
}

interface QuickStartItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

export function FileWorkspace({ projectId, projectType = 'scene-based', className = '' }: FileWorkspaceProps) {
  const { showToast } = useToast();
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileNode[]>([]);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileError, setNewFileError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleFileSelect = useCallback(async (filePath: string) => {
    setSelectedFile(filePath);
    setLoading(true);
    setFileContent('');
    try {
      const response = await api.readFile(projectId, filePath);
      setFileContent(response.content || '');
    } catch (err) {
      logger.error('Failed to load file:', err);
      setFileContent('');
      showToast({ type: 'error', message: `Failed to load file: ${filePath}` });
    } finally {
      setLoading(false);
    }
  }, [projectId, showToast]);

  const handleSave = useCallback(async (content: string) => {
    if (!selectedFile) return;

    setSaving(true);
    try {
      await api.writeFile(projectId, selectedFile, content);
      setFileContent(content);
      showToast({ type: 'success', message: `Saved: ${selectedFile}` });
      handleRefresh();
    } catch (err) {
      logger.error('Failed to save file:', err);
      showToast({ type: 'error', message: `Failed to save file: ${err}` });
    } finally {
      setSaving(false);
    }
  }, [projectId, selectedFile, showToast]);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await api.searchFiles(projectId, searchQuery);
      setSearchResults(results);
    } catch (err) {
      logger.error('Failed to search files:', err);
      setSearchResults([]);
    }
  }, [projectId, searchQuery]);

  const handleCreateFile = useCallback(async () => {
    if (!newFileName.trim()) {
      setNewFileError('File name is required');
      return;
    }

    const cleanName = newFileName.trim();
    if (cleanName.includes('..') || cleanName.startsWith('/')) {
      setNewFileError('Invalid file name');
      return;
    }

    setCreating(true);
    setNewFileError(null);

    try {
      await api.writeFile(projectId, cleanName, '');
      setShowNewFileDialog(false);
      setNewFileName('');
      handleRefresh();
      showToast({ type: 'success', message: `File created: ${cleanName}` });
    } catch (err: any) {
      setNewFileError(err.message || 'Failed to create file');
      showToast({ type: 'error', message: `Failed to create file: ${err.message}` });
    } finally {
      setCreating(false);
    }
  }, [newFileName, projectId, showToast]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFileName.trim()) {
      setNewFileError('Folder name is required');
      return;
    }

    const cleanName = newFileName.trim();
    if (cleanName.includes('..') || cleanName.startsWith('/')) {
      setNewFileError('Invalid folder name');
      return;
    }

    setCreating(true);
    setNewFileError(null);

    try {
      await api.createDirectory(projectId, cleanName);
      setShowNewFolderDialog(false);
      setNewFileName('');
      handleRefresh();
      showToast({ type: 'success', message: `Folder created: ${cleanName}` });
    } catch (err: any) {
      setNewFileError(err.message || 'Failed to create folder');
      showToast({ type: 'error', message: `Failed to create folder: ${err.message}` });
    } finally {
      setCreating(false);
    }
  }, [newFileName, projectId, showToast]);

  const closeDialogs = () => {
    setShowNewFileDialog(false);
    setShowNewFolderDialog(false);
    setNewFileName('');
    setNewFileError(null);
  };

  // Quick start suggestions based on project type
  const getQuickStartItems = (): QuickStartItem[] => {
    const commonItems = [
      {
        title: 'Create Scene',
        description: 'Start with a basic game level',
        icon: <FolderOpen size={16} />,
        action: () => {
          const defaultScene = {
            name: 'main-scene',
            entities: [
              {
                id: 'player',
                transform: { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
                components: {
                  playerInput: true,
                  movement: { vx: 0, vy: 0, speed: 200 },
                  sprite: { width: 32, height: 32, color: '#3b82f6' }
                }
              }
            ]
          };

          api.writeFile(projectId, 'scenes/main-scene.json', JSON.stringify(defaultScene, null, 2))
            .then(() => {
              setSelectedFile('scenes/main-scene.json');
              setShowNewFileDialog(false);
              handleRefresh();
              showToast({ type: 'success', message: 'Created default scene' });
            })
            .catch(err => showToast({ type: 'error', message: `Failed to create scene: ${err.message}` }));
        }
      },
      {
        title: 'Add Player Code',
        description: 'Create player character logic',
        icon: <Code size={16} />,
        action: () => {
          const playerCode = `// Player character controller
export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 200;
    this.color = '#3b82f6';
    this.size = 32;
  }

  update(deltaTime, keys) {
    // Handle input
    if (keys['left'] || keys['a']) {
      this.x -= this.speed * deltaTime;
    }
    if (keys['right'] || keys['d']) {
      this.x += this.speed * deltaTime;
    }
    if (keys['up'] || keys['w']) {
      this.y -= this.speed * deltaTime;
    }
    if (keys['down'] || keys['s']) {
      this.y += this.speed * deltaTime;
    }
  }

  render(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
  }
}

// Export for use in main game
export default Player;`;

          api.writeFile(projectId, 'scripts/player.ts', playerCode)
            .then(() => {
              setSelectedFile('scripts/player.ts');
              setShowNewFileDialog(false);
              handleRefresh();
              showToast({ type: 'success', message: 'Created player controller' });
            })
            .catch(err => showToast({ type: 'error', message: `Failed to create file: ${err.message}` }));
        }
      }
    ];

    // Add project-specific suggestions
    if (projectType === 'scene-based') {
      commonItems.unshift({
        title: 'Add Enemy AI',
        description: 'Create enemy behavior patterns',
        icon: <Settings size={16} />,
        action: () => {
          const enemyCode = `// Enemy AI controller
export class EnemyAI {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.patrolRadius = 100;
    this.patrolSpeed = 50;
    this.centerX = x;
    this.centerY = y;
    this.time = 0;
  }

  update(deltaTime) {
    this.time += deltaTime;

    // Patrol movement
    this.x = this.centerX + Math.sin(this.time * this.patrolSpeed / 1000) * this.patrolRadius;
    this.y = this.centerY + Math.cos(this.time * this.patrolSpeed / 1000) * this.patrolRadius;
  }

  render(ctx) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(this.x - 16, this.y - 16, 32, 32);
  }
}

export default EnemyAI;`;

          api.writeFile(projectId, 'scripts/enemy.ts', enemyCode)
            .then(() => {
              setSelectedFile('scripts/enemy.ts');
              setShowNewFileDialog(false);
              handleRefresh();
              showToast({ type: 'success', message: 'Created enemy AI' });
            })
            .catch(err => showToast({ type: 'error', message: `Failed to create file: ${err.message}` }));
        }
      });
    }

    return commonItems;
  };

  const quickStartItems = useMemo(() => getQuickStartItems(), [projectType, projectId, showToast]);

  return (
    <div className={`file-workspace ${className}`}>
      <div className="workspace-header">
        <h2>Code Workspace</h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>Search</button>
        </div>
      </div>

      <div className="workspace-content">
        {/* Left sidebar - File Tree */}
        <div className="sidebar">
          <FileTree
            projectId={projectId}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile || ''}
            key={refreshKey}
          />
        </div>

        {/* Main content - Code Editor */}
        <div className="main-content">
          {selectedFile ? (
            <CodeEditor
              projectId={projectId}
              filePath={selectedFile}
              onSave={handleSave}
              onLoad={async () => fileContent}
              readOnly={false}
              loading={loading}
              className=""
            />
          ) : (
            <div className="empty-editor">
              <div className="empty-message">
                <div className="empty-icon">📝</div>
                <h3>No file selected</h3>
                <p>Your project is ready! Select a file from tree or create something new.</p>
                <p className="hint">Quick start below to get coding quickly</p>
              </div>

              {/* Quick Start Actions */}
              <div className="quick-start-section">
                <h4 className="quick-start-title">
                  <Sparkles size={16} />
                  Quick Start
                </h4>
                <div className="quick-start-grid">
                  {quickStartItems.map((item) => (
                    <button
                      key={item.title}
                      className="quick-start-item"
                      onClick={item.action}
                      title={item.description}
                    >
                      <div className="quick-start-icon">{item.icon}</div>
                      <div className="quick-start-content">
                        <div className="quick-start-title">{item.title}</div>
                        <div className="quick-start-desc">{item.description}</div>
                      </div>
                      <div className="quick-start-arrow">→</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Create File Prompt */}
              <div className="create-file-prompt">
                <p>Need something specific?</p>
                <button
                  className="create-file-btn"
                  onClick={() => setShowNewFileDialog(true)}
                >
                  <FileText size={14} />
                  Create Custom File
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="search-results">
                  <h4>Search Results</h4>
                  <ul>
                    {searchResults.map((result) => (
                      <li
                        key={result.path}
                        onClick={() => handleFileSelect(result.path)}
                        className="search-result-item"
                      >
                        <span className="result-name">{result.name}</span>
                        <span className="result-path">{result.path}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <button className="action-btn" onClick={() => { setShowNewFileDialog(true); setNewFileError(null); }}>
          ➕ New File
        </button>
        <button className="action-btn" onClick={() => { setShowNewFolderDialog(true); setNewFileError(null); }}>
          📁 New Folder
        </button>
        <button className="action-btn" onClick={handleRefresh}>
          🔄 Refresh
        </button>
      </div>

      {/* New File Dialog */}
      {showNewFileDialog && (
        <div className="dialog-overlay" onClick={closeDialogs}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Create New File</h3>
            <p className="dialog-hint">Enter a file path relative to project root (e.g. <code>scripts/player.ts</code>)</p>
            <input
              type="text"
              placeholder="scripts/main.ts"
              value={newFileName}
              onChange={(e) => { setNewFileName(e.target.value); setNewFileError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
              autoFocus
              className="dialog-input"
            />
            {newFileError && <p className="dialog-error">{newFileError}</p>}
            <div className="dialog-actions">
              <button className="dialog-btn secondary" onClick={closeDialogs}>Cancel</button>
              <button className="dialog-btn primary" onClick={handleCreateFile} disabled={creating}>
                {creating ? 'Creating...' : 'Create File'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="dialog-overlay" onClick={closeDialogs}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Folder</h3>
            <p className="dialog-hint">Enter a folder path relative to project root (e.g. <code>scenes/level1</code>)</p>
            <input
              type="text"
              placeholder="scenes/level1"
              value={newFileName}
              onChange={(e) => { setNewFileName(e.target.value); setNewFileError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
              className="dialog-input"
            />
            {newFileError && <p className="dialog-error">{newFileError}</p>}
            <div className="dialog-actions">
              <button className="dialog-btn secondary" onClick={closeDialogs}>Cancel</button>
              <button className="dialog-btn primary" onClick={handleCreateFolder} disabled={creating}>
                {creating ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
