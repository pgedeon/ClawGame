/**
 * @clawgame/web - Property Inspector Panel
 * Right sidebar for entity property editing, component management, and entity list
 */

import React from 'react';
import { Entity, Transform, Scene, Sprite } from '@clawgame/engine';

interface PropertyInspectorProps {
  scene: Scene | null;
  selectedEntityId: string | null;
  onUpdateProperty: <K extends keyof Transform>(property: K, value: Transform[K]) => void;
  onAddComponent: (componentType: string) => void;
  onRemoveComponent: (componentType: string) => void;
  onSelectEntity: (entityId: string | null) => void;
  onDeleteEntity: (entityId: string) => void;
  onDuplicateEntity: (entityId: string) => void;
}

export function PropertyInspector({
  scene,
  selectedEntityId,
  onUpdateProperty,
  onAddComponent,
  onRemoveComponent,
  onSelectEntity,
  onDeleteEntity,
  onDuplicateEntity,
}: PropertyInspectorProps) {
  const selectedEntity = selectedEntityId ? scene?.entities.get(selectedEntityId) : null;

  return (
    <div className="inspector-panel">
      {selectedEntity && scene ? (
        <>
          <div className="inspector-section">
            <h3>📋 Entity Properties</h3>
            <div className="entity-info">
              <label>ID</label>
              <input type="text" value={selectedEntityId!} readOnly className="readonly" />
            </div>
          </div>

          {/* Transform Component */}
          <div className="inspector-section">
            <h3>📍 Transform</h3>
            <div className="property-row">
              <label>X</label>
              <input
                type="number"
                value={Math.round(selectedEntity.transform.x || 0)}
                onChange={(e) => onUpdateProperty('x', Number(e.target.value))}
              />
            </div>
            <div className="property-row">
              <label>Y</label>
              <input
                type="number"
                value={Math.round(selectedEntity.transform.y || 0)}
                onChange={(e) => onUpdateProperty('y', Number(e.target.value))}
              />
            </div>
            <div className="property-row">
              <label>Rotation</label>
              <input
                type="number"
                value={Math.round(selectedEntity.transform.rotation || 0)}
                onChange={(e) => onUpdateProperty('rotation', Number(e.target.value))}
              />
            </div>
            <div className="property-row">
              <label>Scale X</label>
              <input
                type="number"
                step="0.1"
                value={selectedEntity.transform.scaleX || 1}
                onChange={(e) => onUpdateProperty('scaleX', Number(e.target.value))}
              />
            </div>
            <div className="property-row">
              <label>Scale Y</label>
              <input
                type="number"
                step="0.1"
                value={selectedEntity.transform.scaleY || 1}
                onChange={(e) => onUpdateProperty('scaleY', Number(e.target.value))}
              />
            </div>
          </div>

          {/* Components */}
          <div className="inspector-section">
            <h3>🧩 Components</h3>
            <div className="component-list">
              {Array.from(selectedEntity.components.keys())
                .filter((key) => key !== 'playerInput')
                .map((componentType) => (
                  <div key={componentType} className="component-item">
                    <span className="component-name">{componentType}</span>
                    <button
                      className="remove-btn"
                      onClick={() => onRemoveComponent(componentType)}
                      title="Remove component"
                    >
                      ✕
                    </button>
                  </div>
                ))}
            </div>
          </div>

          <div className="inspector-section">
            <h3>Add Component</h3>
            <div className="component-buttons">
              <button onClick={() => onAddComponent('sprite')} disabled={selectedEntity.components.has('sprite')}>
                + Sprite
              </button>
              <button onClick={() => onAddComponent('movement')} disabled={selectedEntity.components.has('movement')}>
                + Movement
              </button>
              <button onClick={() => onAddComponent('ai')} disabled={selectedEntity.components.has('ai')}>
                + AI
              </button>
              <button onClick={() => onAddComponent('collision')} disabled={selectedEntity.components.has('collision')}>
                + Collision
              </button>
            </div>
          </div>

          <div className="inspector-section">
            <h3>🎯 Actions</h3>
            <div className="action-buttons">
              <button className="danger-btn" onClick={() => onDeleteEntity(selectedEntityId!)}>
                🗑️ Delete Entity
              </button>
              <button className="duplicate-btn" onClick={() => onDuplicateEntity(selectedEntityId!)}>
                📋 Duplicate
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="inspector-placeholder">
          <p>Select an entity to edit its properties</p>
          <p className="hint">Or use Add Entity tool to create new entities</p>
          <p className="hint">Drag assets from left panel to canvas</p>
        </div>
      )}

      {/* Entity List */}
      <div className="inspector-section">
        <h3>📦 Entities ({scene?.entities.size || 0})</h3>
        <div className="entity-list">
          {Array.from(scene?.entities.values() || []).map((entity) => (
            <button
              key={entity.id}
              className={`entity-item ${entity.id === selectedEntityId ? 'selected' : ''}`}
              onClick={() => onSelectEntity(entity.id)}
            >
              {entity.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
