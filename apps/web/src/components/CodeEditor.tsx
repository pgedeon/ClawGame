import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap } from '@codemirror/search';
import { api } from '../api/client';
import '../code-editor.css';

interface CodeEditorProps {
  projectId: string;
  filePath: string;
  onSave?: (content: string) => void;
  readOnly?: boolean;
  className?: string;
}

function getLanguageExtension(filePath: string) {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return javascript({ jsx: true, typescript: ext.startsWith('t') });
    case 'json':
      return json();
    case 'css':
      return css();
    case 'html':
      return html();
    case 'md':
    case 'markdown':
      return markdown();
    default:
      return [];
  }
}

function isDarkMode(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function CodeEditor({ projectId, filePath, onSave, readOnly = false, className }: CodeEditorProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const contentRef = useRef(content);
  const hasChangesRef = useRef(false);

  // Load file content when file path changes
  useEffect(() => {
    if (!filePath) return;
    loadFileContent();
  }, [projectId, filePath]);

  // Keep ref in sync
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const loadFileContent = async () => {
    if (!filePath) return;

    setIsLoading(true);
    try {
      const response = await api.readFile(projectId, filePath);
      const newContent = response.content;
      setContent(newContent);
      setHasChanges(false);
      hasChangesRef.current = false;

      // Update editor content if view exists
      if (viewRef.current) {
        const currentState = viewRef.current.state;
        viewRef.current.dispatch({
          changes: { from: 0, to: currentState.doc.length, insert: newContent }
        });
      }
    } catch (err) {
      console.error('Failed to load file:', err);
      setContent('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!filePath || isSaving || !hasChangesRef.current) return;

    setIsSaving(true);
    try {
      await api.writeFile(projectId, filePath, contentRef.current);
      setHasChanges(false);
      hasChangesRef.current = false;
      setLastSaved(new Date().toLocaleTimeString());
      onSave?.(contentRef.current);
    } catch (err) {
      console.error('Failed to save file:', err);
    } finally {
      setIsSaving(false);
    }
  }, [filePath, projectId, isSaving, onSave]);

  const handleReset = () => {
    if (!filePath) return;
    loadFileContent();
  };

  // Create/update CodeMirror editor
  useEffect(() => {
    if (!editorRef.current || isLoading) return;

    // Destroy previous editor
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const saveKeymap = keymap.of([{
      key: 'Mod-s',
      run: () => {
        handleSave();
        return true;
      },
      preventDefault: true,
    }]);

    const langExt = getLanguageExtension(filePath);
    const dark = isDarkMode();

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      bracketMatching(),
      closeBrackets(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      saveKeymap,
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
      ]),
      EditorView.lineWrapping,
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-mono)' },
        '.cm-content': { fontFamily: 'var(--font-mono)' },
        '.cm-gutters': {
          background: dark ? '#1e293b' : '#f1f5f9',
          color: dark ? '#64748b' : '#94a3b8',
          border: 'none',
        },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString();
          setContent(newContent);
          contentRef.current = newContent;
          setHasChanges(true);
          hasChangesRef.current = true;
        }
      }),
    ];

    if (Array.isArray(langExt)) {
      extensions.push(...langExt);
    } else {
      extensions.push(langExt);
    }

    if (dark) {
      extensions.push(oneDark);
    }

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true));
    }

    const state = EditorState.create({
      doc: content,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [filePath, isLoading, readOnly]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, []);

  if (isLoading) {
    return <div className={`code-editor ${className}`}>
      <div className="editor-loading">
        <div className="editor-loading-spinner" />
        <span>Loading file...</span>
      </div>
    </div>;
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
                title="Save (Ctrl+S)"
              >
                {isSaving ? 'Saving...' : '💾 Save'}
              </button>
              <button onClick={handleReset} disabled={isSaving} className="reset-btn">
                ↩ Reset
              </button>
            </>
          )}
        </div>
      </div>

      <div ref={editorRef} className="codemirror-container" />

      {readOnly && (
        <div className="editor-footer">
          <p>This file is read-only. Create a copy to edit.</p>
        </div>
      )}
    </div>
  );
}
