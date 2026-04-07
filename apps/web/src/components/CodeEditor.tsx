import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import '../code-editor.css';

interface CodeEditorProps {
  projectId: string;
  filePath: string;
  onSave?: (content: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function CodeEditor({ projectId, filePath, onSave, readOnly = false, className }: CodeEditorProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Load file content when file path changes
  useEffect(() => {
    if (!filePath) return;
    
    loadFileContent();
  }, [projectId, filePath]);

  const loadFileContent = async () => {
    if (!filePath) return;
    
    setIsLoading(true);
    try {
      const response = await api.readFile(projectId, filePath);
      setContent(response.content);
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to load file:', err);
      setContent('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setHasChanges(newContent !== content);
  }, [content]);

  const handleSave = async () => {
    if (!filePath || isSaving || !hasChanges) return;

    setIsSaving(true);
    try {
      await api.writeFile(projectId, filePath, content);
      setHasChanges(false);
      setLastSaved(new Date().toLocaleTimeString());
      onSave?.(content);
    } catch (err) {
      console.error('Failed to save file:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!filePath) return;
    loadFileContent();
  };

  if (isLoading) {
    return <div className={`code-editor ${className}`}>Loading file...</div>;
  }

  return (
    <div className={`code-editor ${className}`}>
      <div className="editor-header">
        <div className="file-info">
          <span className="file-path">{filePath}</span>
          {hasChanges && <span className="unsaved-badge">Unsaved</span>}
          {lastSaved && <span className="last-saved">Last saved: {lastSaved}</span>}
        </div>
        
        <div className="editor-actions">
          {!readOnly && (
            <>
              <button 
                onClick={handleSave} 
                disabled={!hasChanges || isSaving}
                className="save-btn"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={handleReset} disabled={isSaving} className="reset-btn">
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      <textarea
        className="editor-textarea"
        value={content}
        onChange={handleContentChange}
        readOnly={readOnly}
        spellCheck={false}
        placeholder="# Edit your code here..."
      />

      {readOnly && (
        <div className="editor-footer">
          <p>This file is read-only. Create a copy to edit.</p>
        </div>
      )}
    </div>
  );
}
