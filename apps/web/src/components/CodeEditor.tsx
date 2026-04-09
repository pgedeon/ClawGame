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
import { logger } from '../utils/logger';

interface CodeEditorProps {
  projectId: string;
  filePath: string;
  onSave?: (content: string) => void;
  onLoad?: (content: string) => Promise<string>;
  readOnly?: boolean;
  loading?: boolean;
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

export function CodeEditor({ projectId, filePath, onSave, onLoad, readOnly = false, loading = false, className }: CodeEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  // contentReady is set to filePath when content is loaded, triggering editor creation
  const [contentReady, setContentReady] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const contentRef = useRef('');
  const needsFocus = useRef(false);
  const handleSaveRef = useRef<() => void>();

  // Reset and load when filePath changes
  useEffect(() => {
    if (!filePath) return;
    setContentReady(null); // reset first
    loadFileContent();
  }, [projectId, filePath]);

  const handleSave = useCallback(async () => {
    if (!filePath || isSaving || !hasChanges || !onSave) return;

    setIsSaving(true);
    try {
      await api.writeFile(projectId, filePath, contentRef.current);
      setHasChanges(false);
      setLastSaved(new Date().toLocaleTimeString());
      onSave(contentRef.current);
    } catch (err) {
      logger.error('Failed to save file:', err);
    } finally {
      setIsSaving(false);
    }
  }, [filePath, projectId, isSaving, hasChanges, onSave]);

  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  const loadFileContent = async () => {
    if (!filePath) return;

    let newContent = '';
    setIsSaving(true);

    try {
      if (onLoad) {
        newContent = await onLoad(filePath);
      } else {
        const response = await api.readFile(projectId, filePath);
        newContent = response.content || '';
      }

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
        setIsSaving(false);
        if (needsFocus.current) {
          viewRef.current.focus();
          needsFocus.current = false;
        }
        setContentReady(filePath);
        return;
      }

      // Signal that content is ready for editor creation
      setContentReady(filePath);
    } catch (err) {
      logger.error('Failed to load file:', err);
      contentRef.current = '';
      setContentReady(filePath); // still mark ready so empty editor shows
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!filePath) return;
    setContentReady(null);
    loadFileContent();
  };

  // Create CodeMirror editor when content is ready
  useEffect(() => {
    if (!editorRef.current || !contentReady) return;

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
  }, [contentReady, readOnly]); // Recreate when content loads or readOnly changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`code-editor ${className}`}>
      <div className="editor-header">
        <div className="file-info">
          <span className="file-path">{filePath}</span>
          {loading && isSaving && <span className="loading-badge">Loading...</span>}
          {hasChanges && !isSaving && <span className="unsaved-badge">Unsaved</span>}
          {lastSaved && <span className="last-saved">Last saved: {lastSaved}</span>}
        </div>

        <div className="editor-actions">
          {!readOnly && !loading && (
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
        className={`codemirror-container ${!contentReady ? 'loading' : ''}`}
        onClick={() => {
          if (viewRef.current) {
            viewRef.current.focus();
          }
        }}
      />

      {loading && (
        <div className="editor-loading">
          <div className="editor-loading-spinner" />
          <span>Loading file...</span>
        </div>
      )}

      {readOnly && (
        <div className="editor-footer">
          <p>This file is read-only. Create a copy to edit.</p>
        </div>
      )}
    </div>
  );
}
