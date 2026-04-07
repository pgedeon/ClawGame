/**
 * @clawgame/web - Code Editor Component
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState, Extension } from '@codemirror/state';
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

function getLanguageExtension(filePath: string): Extension {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'js':
    case 'jsx':
      return javascript({ jsx: true });
    case 'ts':
    case 'tsx':
      return javascript({ jsx: true, typescript: true });
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const contentRef = useRef('');
  const needsFocus = useRef(false);
  const handleSaveRef = useRef<() => void>();

  // Load file content when file path changes
  useEffect(() => {
    if (!filePath) return;
    loadFileContent();
  }, [projectId, filePath]);

  const handleSave = useCallback(async () => {
    if (!filePath || isSaving || !hasChanges) return;

    setIsSaving(true);
    try {
      await api.writeFile(projectId, filePath, contentRef.current);
      setHasChanges(false);
      setLastSaved(new Date().toLocaleTimeString());
      onSave?.(contentRef.current);
    } catch (err) {
      console.error('Failed to save file:', err);
    } finally {
      setIsSaving(false);
    }
  }, [filePath, projectId, isSaving, hasChanges, onSave]);

  // Keep ref to latest save handler
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  const loadFileContent = async () => {
    if (!filePath) return;

    setIsLoading(true);
    try {
      const response = await api.readFile(projectId, filePath);
      const newContent = response.content;
      contentRef.current = newContent;
      setHasChanges(false);
      needsFocus.current = true;

      // If editor already exists, update its content without destroying it
      if (viewRef.current) {
        const currentDoc = viewRef.current.state.doc.toString();
        if (currentDoc !== newContent) {
          viewRef.current.dispatch({
            changes: {
              from: 0,
              to: viewRef.current.state.doc.length,
              insert: newContent,
            },
          });
        }
        setIsLoading(false);
        if (needsFocus.current) {
          viewRef.current.focus();
          needsFocus.current = false;
        }
        return;
      }
    } catch (err) {
      console.error('Failed to load file:', err);
      contentRef.current = '';
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (!filePath) return;
    loadFileContent();
  };

  // Create CodeMirror editor once (NOT re-creating on content change)
  useEffect(() => {
    if (!editorRef.current) return;

    // Destroy previous editor
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const saveKeymap = keymap.of([{
      key: 'Mod-s',
      run: () => {
        handleSaveRef.current?.();
        return true;
      },
      preventDefault: true,
    }]);

    const langExt = getLanguageExtension(filePath);
    const dark = isDarkMode();

    const extensions: Extension[] = [
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
          contentRef.current = newContent;
          setHasChanges(true);
        }
      }),
    ];

    extensions.push(langExt);

    if (dark) {
      extensions.push(oneDark);
    }

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true));
    }

    const state = EditorState.create({
      doc: contentRef.current,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Focus if needed
    if (needsFocus.current) {
      view.focus();
      needsFocus.current = false;
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [filePath, readOnly]); // Intentionally NOT including content — only recreate on file/type change

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
                type="button"
              >
                {isSaving ? 'Saving...' : '💾 Save'}
              </button>
              <button onClick={handleReset} disabled={isSaving} className="reset-btn" type="button">
                ↩ Reset
              </button>
            </>
          )}
        </div>
      </div>

      <div 
        ref={editorRef} 
        className="codemirror-container"
        onClick={() => {
          if (viewRef.current) {
            viewRef.current.focus();
          }
        }}
      />

      {readOnly && (
        <div className="editor-footer">
          <p>This file is read-only. Create a copy to edit.</p>
        </div>
      )}
    </div>
  );
}
