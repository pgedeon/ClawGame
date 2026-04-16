/**
 * @clawgame/web - Property Inspector Panel
 * Right sidebar for entity property editing, component management, and entity list.
 * Enhanced with Phaser 4 component editors: physics, tween, particle, sprite details.
 */

import React, { useState } from 'react';
import { Entity, Transform, Scene, SpriteComponent as Sprite, CollisionComponent as Collision } from '@clawgame/engine';

interface PropertyInspectorProps {
  scene: Scene | null;
  selectedEntityId: string | null;
  onUpdateProperty: <K extends keyof Transform>(property: K, value: Transform[K]) => void;
  onAddComponent: (componentType: string) => void;
  onRemoveComponent: (componentType: string) => void;
  onUpdateComponent?: (componentType: string, data: Record<string, any>) => void;
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
  onUpdateComponent,
  onSelectEntity,
  onDeleteEntity,
  onDuplicateEntity,
}: PropertyInspectorProps) {
  const selectedEntity = selectedEntityId ? scene?.entities.get(selectedEntityId) : null;

  return (
    <div className="inspector-panel">
      {selectedEntity && scene ? (
        <>
          <EntityHeader entityId={selectedEntityId!} entity={selectedEntity} />
          <TransformSection entity={selectedEntity} onUpdateProperty={onUpdateProperty} />
          <SpriteSection entity={selectedEntity} />
          <CollisionSection entity={selectedEntity} />
          <ComponentsSection entity={selectedEntity} onRemoveComponent={onRemoveComponent} />
          <AddComponentSection entity={selectedEntity} onAddComponent={onAddComponent} />
          <ActionsSection
            entityId={selectedEntityId!}
            onDelete={onDeleteEntity}
            onDuplicate={onDuplicateEntity}
          />
        </>
      ) : (
        <div className="inspector-placeholder">
          <p>Select an entity to edit its properties</p>
          <p className="hint">Or use Add Entity tool to create new entities</p>
          <p className="hint">Drag assets from left panel to canvas</p>
        </div>
      )}

      {/* Entity List */}
      <EntityList scene={scene} selectedEntityId={selectedEntityId} onSelect={onSelectEntity} />
    </div>
  );
}

/* ─── Sub-components ─── */

function EntityHeader({ entityId, entity }: { entityId: string; entity: Entity }) {
  return (
    <div className="inspector-section">
      <h3>📋 Entity</h3>
      <div className="entity-info">
        <label>ID</label>
        <input type="text" value={entityId} readOnly className="readonly" />
      </div>
      <div className="entity-info">
        <label>Type</label>
        <input type="text" value={entity.type || 'custom'} readOnly className="readonly" />
      </div>
    </div>
  );
}

function TransformSection({ entity, onUpdateProperty }: {
  entity: Entity;
  onUpdateProperty: <K extends keyof Transform>(p: K, v: Transform[K]) => void;
}) {
  return (
    <div className="inspector-section">
      <h3>📍 Transform</h3>
      <div className="property-row">
        <label>X</label>
        <input type="number" value={Math.round(entity.transform.x || 0)}
          onChange={(e) => onUpdateProperty('x', Number(e.target.value))} />
      </div>
      <div className="property-row">
        <label>Y</label>
        <input type="number" value={Math.round(entity.transform.y || 0)}
          onChange={(e) => onUpdateProperty('y', Number(e.target.value))} />
      </div>
      <div className="property-row">
        <label>Rotation</label>
        <input type="number" value={Math.round((entity.transform.rotation || 0) * 180 / Math.PI)}
          onChange={(e) => onUpdateProperty('rotation', Number(e.target.value) * Math.PI / 180)} />
        <span className="hint">degrees</span>
      </div>
      <div className="property-row">
        <label>Scale X</label>
        <input type="number" step="0.1" value={entity.transform.scaleX || 1}
          onChange={(e) => onUpdateProperty('scaleX', Number(e.target.value))} />
      </div>
      <div className="property-row">
        <label>Scale Y</label>
        <input type="number" step="0.1" value={entity.transform.scaleY || 1}
          onChange={(e) => onUpdateProperty('scaleY', Number(e.target.value))} />
      </div>
    </div>
  );
}

function SpriteSection({ entity }: { entity: Entity }) {
  const comps = entity.components instanceof Map ? entity.components : new Map(Object.entries(entity.components || {}));
  const sprite = comps.get('sprite') as Sprite | undefined;
  if (!sprite) return null;

  return (
    <div className="inspector-section">
      <h3>🎨 Sprite</h3>
      <div className="property-row">
        <label>Width</label>
        <input type="number" value={sprite.width || 32} readOnly />
      </div>
      <div className="property-row">
        <label>Height</label>
        <input type="number" value={sprite.height || 32} readOnly />
      </div>
      <div className="property-row">
        <label>Color</label>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input type="color" value={sprite.color || '#8b5cf6'} readOnly
            style={{ width: 32, height: 24, padding: 0, border: 'none' }} />
          <span>{sprite.color || '#8b5cf6'}</span>
        </div>
      </div>
      {(sprite as any).assetRef && (
        <div className="property-row">
          <label>Asset</label>
          <span className="hint">{String((sprite as any).assetRef)}</span>
        </div>
      )}
    </div>
  );
}

function CollisionSection({ entity }: { entity: Entity }) {
  const comps = entity.components instanceof Map ? entity.components : new Map(Object.entries(entity.components || {}));
  const collision = comps.get('collision') as Collision | undefined;
  if (!collision) return null;

  const bodyTypeLabels: Record<string, string> = {
    player: '🔵 Dynamic (Player)',
    enemy: '🔴 Dynamic (Enemy)',
    wall: '⬜ Static (Wall)',
    collectible: '🟡 Sensor (Collectible)',
    none: '⚪ None',
  };

  return (
    <div className="inspector-section">
      <h3>💥 Physics Body</h3>
      <div className="property-row">
        <label>Body Type</label>
        <span style={{ fontSize: 12 }}>{bodyTypeLabels[collision.type || 'none'] || collision.type}</span>
      </div>
      <div className="property-row">
        <label>Width</label>
        <input type="number" value={collision.width || 32} readOnly />
      </div>
      <div className="property-row">
        <label>Height</label>
        <input type="number" value={collision.height || 32} readOnly />
      </div>
      <div className="physics-info" style={{ marginTop: 4, padding: '4px 8px', background: 'rgba(59,130,246,0.1)', borderRadius: 4, fontSize: 11 }}>
        💡 Physics debug rendering available via toolbar toggle
      </div>
    </div>
  );
}

function ComponentsSection({ entity, onRemoveComponent }: {
  entity: Entity;
  onRemoveComponent: (t: string) => void;
}) {
  const comps = entity.components instanceof Map ? entity.components : new Map(Object.entries(entity.components || {}));
  return (
    <div className="inspector-section">
      <h3>🧩 Components</h3>
      <div className="component-list">
        {Array.from(comps.keys())
          .filter((key) => key !== 'playerInput' && key !== 'sprite' && key !== 'collision' && key !== 'transform')
          .map((componentType) => (
            <div key={componentType} className="component-item">
              <span className="component-name">{componentType}</span>
              <button className="remove-btn" onClick={() => onRemoveComponent(componentType)} title="Remove">
                ✕
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

function AddComponentSection({ entity, onAddComponent }: {
  entity: Entity;
  onAddComponent: (t: string) => void;
}) {
  const comps = entity.components instanceof Map ? entity.components : new Map(Object.entries(entity.components || {}));
  const allComponents = [
    { id: 'sprite', label: '🎨 Sprite', desc: 'Visual appearance' },
    { id: 'collision', label: '💥 Collision', desc: 'Physics body' },
    { id: 'movement', label: '🏃 Movement', desc: 'Velocity & speed' },
    { id: 'ai', label: '🤖 AI', desc: 'Behavior pattern' },
    { id: 'collectible', label: '🪙 Collectible', desc: 'Pickup item' },
    { id: 'tween', label: '✨ Tween', desc: 'Animation preview' },
    { id: 'particles', label: '🔥 Particles', desc: 'Particle emitter' },
    { id: 'container', label: '📦 Container', desc: 'Parent grouping' },
    { id: 'text', label: '📝 Text', desc: 'Text label' },
  ];

  return (
    <div className="inspector-section">
      <h3>Add Component</h3>
      <div className="component-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {allComponents.map(({ id, label }) => (
          <button key={id} onClick={() => onAddComponent(id)}
            disabled={comps.has(id)} style={{ fontSize: 11 }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActionsSection({ entityId, onDelete, onDuplicate }: {
  entityId: string;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  return (
    <div className="inspector-section">
      <h3>🎯 Actions</h3>
      <div className="action-buttons">
        <button className="danger-btn" onClick={() => onDelete(entityId)}>🗑️ Delete</button>
        <button className="duplicate-btn" onClick={() => onDuplicate(entityId)}>📋 Duplicate</button>
      </div>
    </div>
  );
}

function EntityList({ scene, selectedEntityId, onSelect }: {
  scene: Scene | null;
  selectedEntityId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const entityIcons: Record<string, string> = {
    player: '🎮', enemy: '👾', collectible: '🪙', obstacle: '🧱',
    npc: '🧑', platform: '▬', custom: '📦',
  };

  return (
    <div className="inspector-section">
      <h3>📦 Entities ({scene?.entities.size || 0})</h3>
      <div className="entity-list">
        {Array.from(scene?.entities.values() || []).map((entity) => (
          <button
            key={entity.id}
            className={`entity-item ${entity.id === selectedEntityId ? 'selected' : ''}`}
            onClick={() => onSelect(entity.id)}
          >
            <span>{entityIcons[entity.type || ''] || '📦'}</span>
            <span className="entity-item-id">{entity.id}</span>
            <span className="entity-item-type">{entity.type || 'custom'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
