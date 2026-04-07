import React, { useState, useCallback } from 'react';
import { FileTree } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { api } from '../api/client';

interface FileWorkspaceProps {
  projectId: string;
  className?: string;
}

export function FileWorkspace({ projectId, className }: FileWorkspaceProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileError, setNewFileError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath);
  };

  const handleSave = (content: string) => {
    // File save completed successfully
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await api.searchFiles(projectId, searchQuery);
      setSearchResults(results || []);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setSearchResults([]);
  };

  const handleCreateFile = useCallback(async () => {
    if (!newFileName.trim()) {
      setNewFileError('File name is required');
      return;
    }

    // Validate file name
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
      // Auto-select the new file
      setSelectedFile(cleanName);
    } catch (err: any) {
      setNewFileError(err.message || 'Failed to create file');
    } finally {
      setCreating(false);
    }
  }, [newFileName, projectId]);

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
    } catch (err: any) {
      setNewFileError(err.message || 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  }, [newFileName, projectId]);

  const closeDialogs = () => {
    setShowNewFileDialog(false);
    setShowNewFolderDialog(false);
    setNewFileName('');
    setNewFileError(null);
  };

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
            />
          ) : (
            <div className="empty-editor">
              <div className="empty-message">
                <div className="empty-icon">📝</div>
                <h3>No file selected</h3>
                <p>Select a file from the tree to start editing</p>
                <p className="hint">Use the ➕ New File button below to create a file</p>
              </div>

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
            <p className="dialog-hint">Enter a file path relative to the project root (e.g. <code>scripts/player.ts</code>)</p>
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
            <p className="dialog-hint">Enter a folder path relative to the project root (e.g. <code>scenes/level1</code>)</p>
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
