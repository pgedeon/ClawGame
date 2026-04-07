import React, { useState } from 'react';
import { FileTree } from './FileTree';
import { CodeEditor } from './CodeEditor';

interface FileWorkspaceProps {
  projectId: string;
  className?: string;
}

export function FileWorkspace({ projectId, className }: FileWorkspaceProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath);
  };

  const handleSave = (content: string) => {
    console.log(`File saved: ${selectedFile}`, content.length);
    // TODO: Add notification system
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/projects/${projectId}/files/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    }
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
                <h3>No file selected</h3>
                <p>Select a file from the tree to start editing</p>
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
        <button className="action-btn">
          ➕ New File
        </button>
        <button className="action-btn">
          📁 New Folder
        </button>
        <button className="action-btn">
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}