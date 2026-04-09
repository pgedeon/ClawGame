/**
 * @clawgame/web - Project Notes Panel
 * Per-project notes, design goals, constraints, and TODOs.
 * Persisted via the API file system at `.clawgame/notes.md`.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StickyNote, Save, Plus, Trash2, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from './Toast';
import { logger } from '../utils/logger';

interface ProjectNotesPanelProps {
  projectId: string;
}

interface NoteSection {
  id: string;
  title: string;
  content: string;
  collapsed: boolean;
}

const NOTES_PATH = '.clawgame/notes.md';
const DEFAULT_SECTIONS: NoteSection[] = [
  { id: 'goals', title: '🎯 Design Goals', content: '', collapsed: false },
  { id: 'constraints', title: '⚠️ Constraints & Rules', content: '', collapsed: true },
  { id: 'todos', title: '📋 TODOs', content: '', collapsed: false },
  { id: 'notes', title: '📝 Free-form Notes', content: '', collapsed: true },
];

export function ProjectNotesPanel({ projectId }: ProjectNotesPanelProps) {
  const [sections, setSections] = useState<NoteSection[]>(DEFAULT_SECTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const { showToast } = useToast();

  // Load notes from project file system
  useEffect(() => {
    loadNotes();
  }, [projectId]);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const result = await api.readFile(projectId, NOTES_PATH);
      const content = result.content;
      const parsed = parseNotesFile(content);
      if (parsed.length > 0) {
        setSections(parsed);
      }
    } catch {
      // File doesn't exist yet — use defaults
      logger.info('No existing notes file, using defaults');
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotes = useCallback(async (updatedSections: NoteSection[]) => {
    setIsSaving(true);
    try {
      const content = serializeNotesFile(updatedSections);
      await api.writeFile(projectId, NOTES_PATH, content);
      setLastSaved(new Date().toLocaleTimeString());
    } catch (err) {
      logger.error('Failed to save notes:', err);
      showToast({ type: 'error', message: 'Failed to save notes' });
    } finally {
      setIsSaving(false);
    }
  }, [projectId, showToast]);

  const updateSection = (id: string, content: string) => {
    const updated = sections.map(s => s.id === id ? { ...s, content } : s);
    setSections(updated);
    // Debounced save
    const timeout = setTimeout(() => saveNotes(updated), 1000);
    return () => clearTimeout(timeout);
  };

  const toggleCollapse = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s));
  };

  const addSection = () => {
    const id = `custom-${Date.now()}`;
    const title = prompt('Section title:');
    if (!title) return;
    setSections(prev => [...prev, { id, title, content: '', collapsed: false }]);
  };

  const removeSection = (id: string) => {
    if (!confirm('Delete this section?')) return;
    const updated = sections.filter(s => s.id !== id);
    setSections(updated);
    saveNotes(updated);
  };

  if (isLoading) {
    return (
      <div className="project-notes-panel">
        <div className="notes-loading">Loading notes...</div>
      </div>
    );
  }

  return (
    <div className="project-notes-panel">
      <div className="notes-header">
        <div className="notes-title">
          <StickyNote size={14} />
          <span>Project Notes</span>
        </div>
        <div className="notes-actions">
          {lastSaved && (
            <span className="notes-saved-at">
              <Save size={10} /> {lastSaved}
            </span>
          )}
          {isSaving && <span className="notes-saving">Saving...</span>}
          <button className="notes-add-btn" onClick={addSection} title="Add section">
            <Plus size={12} />
          </button>
        </div>
      </div>

      <div className="notes-sections">
        {sections.map(section => (
          <div key={section.id} className={`notes-section ${section.collapsed ? 'collapsed' : ''}`}>
            <div className="notes-section-header" onClick={() => toggleCollapse(section.id)}>
              {section.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span className="notes-section-title">{section.title}</span>
              {!DEFAULT_SECTIONS.find(d => d.id === section.id) && (
                <button
                  className="notes-section-delete"
                  onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                  title="Delete section"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
            {!section.collapsed && (
              <textarea
                className="notes-section-editor"
                value={section.content}
                onChange={(e) => updateSection(section.id, e.target.value)}
                placeholder={`Write ${section.title.toLowerCase()} here...`}
                rows={Math.max(3, section.content.split('\n').length + 1)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Parse the notes.md file into sections.
 * Format: ## Section Title\ncontent\n\n
 */
function parseNotesFile(content: string): NoteSection[] {
  const parts = content.split(/^## (.+)$/m).filter(Boolean);
  if (parts.length === 0) return [];

  const sections: NoteSection[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const title = parts[i].trim();
    const body = (parts[i + 1] || '').trim();
    // Check if this matches a default section
    const defaultMatch = DEFAULT_SECTIONS.find(d => d.title === title || d.id === title);
    sections.push({
      id: defaultMatch?.id || `custom-${i}`,
      title: defaultMatch?.title || title,
      content: body,
      collapsed: defaultMatch ? defaultMatch.id !== 'goals' && defaultMatch.id !== 'todos' : false,
    });
  }
  return sections;
}

/**
 * Serialize sections into markdown notes file.
 */
function serializeNotesFile(sections: NoteSection[]): string {
  return sections
    .map(s => `## ${s.title}\n${s.content || ''}`)
    .join('\n\n');
}
