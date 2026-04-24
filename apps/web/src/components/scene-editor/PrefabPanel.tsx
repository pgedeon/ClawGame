/**
 * @clawgame/web - Prefab Library Panel
 * Manage reusable entity templates.
 */

import React, { useState, useCallback } from 'react';
import {
  PrefabLibrary,
  PrefabDefinition,
  UserComponentSchema,
  createDefaultPrefabLibrary,
  createPrefabDefinition,
  addPrefab,
  removePrefab,
  createUserComponentSchema,
} from '@clawgame/engine';
import { Plus, Trash2, Copy, Settings } from 'lucide-react';
import type { Entity } from '@clawgame/engine';

interface PrefabPanelProps {
  library: PrefabLibrary;
  onLibraryChange: (lib: PrefabLibrary) => void;
  sceneEntities: Entity[];
  onInstantiatePrefab?: (prefabKey: string, x: number, y: number) => void;
}

export function PrefabPanel({ library, onLibraryChange, sceneEntities, onInstantiatePrefab }: PrefabPanelProps) {
  const [newPrefabKey, setNewPrefabKey] = useState('');
  const [newPrefabName, setNewPrefabName] = useState('');
  const [selectedPrefab, setSelectedPrefab] = useState<string | null>(null);
  const [showComponentEditor, setShowComponentEditor] = useState(false);

  const handleCreatePrefab = useCallback(() => {
    if (!newPrefabKey.trim() || !newPrefabName.trim()) return;
    const key = newPrefabKey.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    if (library.prefabs.some((p) => p.key === key)) return;
    const prefab = createPrefabDefinition(key, newPrefabName.trim(), []);
    onLibraryChange(addPrefab(library, prefab));
    setSelectedPrefab(key);
    setNewPrefabKey('');
    setNewPrefabName('');
  }, [newPrefabKey, newPrefabName, library, onLibraryChange]);

  const handleDeletePrefab = useCallback(
    (key: string) => {
      onLibraryChange(removePrefab(library, key));
      if (selectedPrefab === key) setSelectedPrefab(null);
    },
    [library, selectedPrefab, onLibraryChange],
  );

  const handleAddComponent = useCallback(
    (schema: UserComponentSchema) => {
      if (!selectedPrefab) return;
      const prefab = library.prefabs.find((p) => p.key === selectedPrefab);
      if (!prefab) return;
      const updated = { ...prefab, components: [...prefab.components, schema] };
      onLibraryChange({
        ...library,
        prefabs: library.prefabs.map((p) => (p.key === selectedPrefab ? updated : p)),
      });
      setShowComponentEditor(false);
    },
    [selectedPrefab, library, onLibraryChange],
  );

  const currentPrefab = library.prefabs.find((p) => p.key === selectedPrefab);

  return (
    <div className="prefab-panel">
      <div className="panel-header">
        <h3>Prefabs ({library.prefabs.length})</h3>
      </div>

      {/* Prefab list */}
      <div className="prefab-list">
        {library.prefabs.map((prefab) => (
          <div
            key={prefab.key}
            className={`prefab-item ${selectedPrefab === prefab.key ? 'selected' : ''}`}
            onClick={() => setSelectedPrefab(prefab.key)}
          >
            <span className="prefab-name">{prefab.name}</span>
            <span className="prefab-meta">
              {prefab.entities.length} entities
              {prefab.components.length > 0 && ` · ${prefab.components.length} components`}
            </span>
            <button
              className="icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                onInstantiatePrefab?.(prefab.key, 400, 300);
              }}
              title="Instantiate in scene"
            >
              <Copy size={14} />
            </button>
            <button
              className="icon-btn danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDeletePrefab(prefab.key);
              }}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {library.prefabs.length === 0 && <div className="empty-state">No prefabs yet.</div>}
      </div>

      {/* Create prefab */}
      <div className="prefab-create">
        <input placeholder="Key" value={newPrefabKey} onChange={(e) => setNewPrefabKey(e.target.value)} />
        <input placeholder="Name" value={newPrefabName} onChange={(e) => setNewPrefabName(e.target.value)} />
        <button className="small-action-btn" onClick={handleCreatePrefab} disabled={!newPrefabKey.trim() || !newPrefabName.trim()}>
          <Plus size={14} /> Create
        </button>
      </div>

      {/* Selected prefab details */}
      {currentPrefab && (
        <div className="prefab-details">
          <h4>{currentPrefab.name}</h4>
          <p>Key: {currentPrefab.key}</p>
          <p>Entities: {currentPrefab.entities.length}</p>

          {/* Components */}
          <div className="components-section">
            <div className="section-header">
              <span>Components ({currentPrefab.components.length})</span>
              <button className="small-action-btn" onClick={() => setShowComponentEditor(!showComponentEditor)}>
                <Plus size={14} /> Add
              </button>
            </div>
            {currentPrefab.components.map((comp) => (
              <div key={comp.key} className="component-item">
                <span>{comp.name}</span>
                <span className="comp-props">
                  {comp.properties.map((p) => p.name).join(', ') || 'no props'}
                </span>
              </div>
            ))}
          </div>

          {showComponentEditor && <ComponentSchemaForm onSubmit={handleAddComponent} onCancel={() => setShowComponentEditor(false)} />}
        </div>
      )}
    </div>
  );
}

function ComponentSchemaForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (schema: UserComponentSchema) => void;
  onCancel: () => void;
}) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  return (
    <div className="component-form">
      <input placeholder="Component key" value={key} onChange={(e) => setKey(e.target.value)} />
      <input placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />
      <input placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <button
        className="small-action-btn"
        onClick={() => {
          if (!key.trim()) return;
          onSubmit(createUserComponentSchema(key.replace(/[^a-zA-Z0-9_-]/g, '_'), name || key, desc));
          setKey('');
          setName('');
          setDesc('');
        }}
      >
        <Settings size={14} /> Save
      </button>
      <button className="small-action-btn" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
