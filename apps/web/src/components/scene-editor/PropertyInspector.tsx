/**
 * @clawgame/web - Property Inspector Panel
 * Right sidebar for entity property editing, component management, and entity list.
 */

import React from 'react';
import {
  Entity,
  Transform,
  Scene,
  SpriteComponent as Sprite,
  CollisionComponent as Collision,
  ENTITY_TYPES,
  type EntityType,
} from '@clawgame/engine';

interface PropertyInspectorProps {
  scene: Scene | null;
  selectedEntityId: string | null;
  onUpdateProperty: <K extends keyof Transform>(property: K, value: Transform[K]) => void;
  onUpdateEntity: (entityId: string, patch: Partial<Pick<Entity, 'name' | 'type'>>) => void;
  onAddComponent: (componentType: string) => void;
  onRemoveComponent: (componentType: string) => void;
  onUpdateComponent: (componentType: string, data: Record<string, any>) => void;
  onBrowseAssets?: () => void;
  onSelectEntity: (entityId: string | null) => void;
  onDeleteEntity: (entityId: string) => void;
  onDuplicateEntity: (entityId: string) => void;
}

const AI_TYPES = ['patrol', 'idle', 'chase'] as const;
const COLLISION_TYPES = ['wall', 'solid', 'player', 'enemy', 'collectible', 'none'] as const;
const HEX_COLOR_RE = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

function getComponents(entity: Entity): Map<string, any> {
  return entity.components instanceof Map
    ? entity.components
    : new Map(Object.entries(entity.components || {}));
}

function clampNumber(value: number, min?: number, max?: number): number {
  if (!Number.isFinite(value)) return min ?? 0;
  let next = value;
  if (typeof min === 'number') next = Math.max(min, next);
  if (typeof max === 'number') next = Math.min(max, next);
  return next;
}

function colorInputValue(value: unknown): string {
  const color = typeof value === 'string' && /^#[0-9a-f]{6}/i.test(value)
    ? value.slice(0, 7)
    : '#8b5cf6';
  return color;
}

function fieldClass(hasError: boolean): string {
  return hasError ? 'invalid' : '';
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null;
}

export function PropertyInspector({
  scene,
  selectedEntityId,
  onUpdateProperty,
  onUpdateEntity,
  onAddComponent,
  onRemoveComponent,
  onUpdateComponent,
  onBrowseAssets,
  onSelectEntity,
  onDeleteEntity,
  onDuplicateEntity,
}: PropertyInspectorProps) {
  const selectedEntity = selectedEntityId ? scene?.entities.get(selectedEntityId) : null;

  return (
    <div className="inspector-panel">
      {selectedEntity && scene ? (
        <>
          <EntityHeader entityId={selectedEntityId!} entity={selectedEntity} onUpdateEntity={onUpdateEntity} />
          <TransformSection entity={selectedEntity} onUpdateProperty={onUpdateProperty} />
          <SpriteSection entity={selectedEntity} onUpdateComponent={onUpdateComponent} onBrowseAssets={onBrowseAssets} />
          <CollisionSection entity={selectedEntity} onUpdateComponent={onUpdateComponent} />
          <TextSection entity={selectedEntity} onUpdateComponent={onUpdateComponent} />
          <MovementSection entity={selectedEntity} onUpdateComponent={onUpdateComponent} />
          <AISection entity={selectedEntity} onUpdateComponent={onUpdateComponent} />
          <ParticlesSection entity={selectedEntity} onUpdateComponent={onUpdateComponent} />
          <CollectibleSection entity={selectedEntity} onUpdateComponent={onUpdateComponent} />
          <ContainerSection entity={selectedEntity} onUpdateComponent={onUpdateComponent} />
          <TweenSection entity={selectedEntity} onUpdateComponent={onUpdateComponent} />
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

      <EntityList scene={scene} selectedEntityId={selectedEntityId} onSelect={onSelectEntity} />
    </div>
  );
}

function EntityHeader({
  entityId,
  entity,
  onUpdateEntity,
}: {
  entityId: string;
  entity: Entity;
  onUpdateEntity: (entityId: string, patch: Partial<Pick<Entity, 'name' | 'type'>>) => void;
}) {
  const name = entity.name ?? '';
  const nameError = name.trim() ? undefined : 'Name is required.';

  return (
    <div className="inspector-section">
      <h3>Entity</h3>
      <div className="entity-info">
        <label>ID</label>
        <input type="text" value={entityId} readOnly className="readonly" />
      </div>
      <div className="entity-info">
        <label>Name</label>
        <input
          type="text"
          value={name}
          className={fieldClass(Boolean(nameError))}
          onChange={(e) => onUpdateEntity(entityId, { name: e.target.value })}
        />
        <FieldError message={nameError} />
      </div>
      <div className="entity-info">
        <label>Type</label>
        <select
          value={entity.type ?? 'custom'}
          onChange={(e) => onUpdateEntity(entityId, { type: e.target.value as EntityType })}
        >
          {ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
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
      <h3>Transform</h3>
      <NumberField label="X" value={entity.transform.x || 0} onCommit={(value) => onUpdateProperty('x', value)} />
      <NumberField label="Y" value={entity.transform.y || 0} onCommit={(value) => onUpdateProperty('y', value)} />
      <NumberField
        label="Rotation"
        value={Math.round((entity.transform.rotation || 0) * 180 / Math.PI)}
        suffix="degrees"
        onCommit={(value) => onUpdateProperty('rotation', value * Math.PI / 180)}
      />
      <NumberField label="Scale X" value={entity.transform.scaleX || 1} step={0.1} onCommit={(value) => onUpdateProperty('scaleX', value)} />
      <NumberField label="Scale Y" value={entity.transform.scaleY || 1} step={0.1} onCommit={(value) => onUpdateProperty('scaleY', value)} />
    </div>
  );
}

function SpriteSection({
  entity,
  onUpdateComponent,
  onBrowseAssets,
}: {
  entity: Entity;
  onUpdateComponent: (componentType: string, data: Record<string, any>) => void;
  onBrowseAssets?: () => void;
}) {
  const sprite = getComponents(entity).get('sprite') as Sprite | undefined;
  if (!sprite) return null;

  const update = (patch: Record<string, any>) => {
    onUpdateComponent('sprite', { ...sprite, ...patch });
  };
  const colorError = sprite.color && !HEX_COLOR_RE.test(sprite.color) ? 'Use #RRGGBB or #RRGGBBAA.' : undefined;

  return (
    <div className="inspector-section">
      <h3>Sprite</h3>
      <NumberField label="Width" value={sprite.width ?? 32} min={1} onCommit={(value) => update({ width: value })} />
      <NumberField label="Height" value={sprite.height ?? 32} min={1} onCommit={(value) => update({ height: value })} />
      <div className="property-row">
        <label>Color</label>
        <div className="inline-controls">
          <input
            type="color"
            value={colorInputValue(sprite.color)}
            onChange={(e) => update({ color: e.target.value })}
            aria-label="Sprite color picker"
          />
          <input
            type="text"
            value={sprite.color ?? '#8b5cf6'}
            className={fieldClass(Boolean(colorError))}
            onChange={(e) => update({ color: e.target.value })}
          />
        </div>
        <FieldError message={colorError} />
      </div>
      <div className="property-row">
        <label>Opacity</label>
        <div className="inline-controls">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={sprite.opacity ?? 1}
            onChange={(e) => update({ opacity: clampNumber(Number(e.target.value), 0, 1) })}
          />
          <span className="number-readout">{(sprite.opacity ?? 1).toFixed(2)}</span>
        </div>
      </div>
      <CheckboxField label="Flip X" checked={Boolean(sprite.flipX)} onChange={(checked) => update({ flipX: checked })} />
      <CheckboxField label="Flip Y" checked={Boolean(sprite.flipY)} onChange={(checked) => update({ flipY: checked })} />
      <NumberField label="Frame" value={sprite.frame ?? 0} min={0} onCommit={(value) => update({ frame: value })} />
      <div className="property-row">
        <label>Asset</label>
        <div className="inline-controls">
          <input
            type="text"
            value={String((sprite as any).assetRef ?? '')}
            placeholder="asset key"
            onChange={(e) => update({ assetRef: e.target.value || undefined })}
          />
          <button type="button" className="small-action-btn" onClick={onBrowseAssets} disabled={!onBrowseAssets}>Browse</button>
        </div>
      </div>
    </div>
  );
}

function CollisionSection({
  entity,
  onUpdateComponent,
}: {
  entity: Entity;
  onUpdateComponent: (componentType: string, data: Record<string, any>) => void;
}) {
  const collision = getComponents(entity).get('collision') as Collision | undefined;
  if (!collision) return null;

  const update = (patch: Record<string, any>) => {
    onUpdateComponent('collision', { ...collision, ...patch });
  };
  const isStaticDefault = collision.type === 'wall' || collision.type === 'solid';

  return (
    <div className="inspector-section">
      <h3>Physics Body</h3>
      <div className="property-row">
        <label>Type</label>
        <select
          value={collision.type ?? 'none'}
          onChange={(e) => {
            const type = e.target.value;
            update({ type, immovable: type === 'wall' || type === 'solid' });
          }}
        >
          {COLLISION_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>
      <NumberField label="Width" value={collision.width ?? 32} min={1} onCommit={(value) => update({ width: value })} />
      <NumberField label="Height" value={collision.height ?? 32} min={1} onCommit={(value) => update({ height: value })} />
      <NumberField label="Offset X" value={(collision as any).offsetX ?? 0} onCommit={(value) => update({ offsetX: value })} />
      <NumberField label="Offset Y" value={(collision as any).offsetY ?? 0} onCommit={(value) => update({ offsetY: value })} />
      <CheckboxField
        label="Immovable"
        checked={(collision as any).immovable ?? isStaticDefault}
        onChange={(checked) => update({ immovable: checked })}
      />
      <NumberField label="Bounce" value={(collision as any).bounce ?? 0} min={0} max={1} step={0.05} onCommit={(value) => update({ bounce: value })} />
      <NumberField label="Drag" value={(collision as any).drag ?? 0} min={0} max={1} step={0.05} onCommit={(value) => update({ drag: value })} />
      <CheckboxField
        label="Allow Gravity"
        checked={Boolean((collision as any).allowGravity)}
        onChange={(checked) => update({ allowGravity: checked })}
      />
      <CheckboxField
        label="Sensor"
        checked={Boolean((collision as any).sensor)}
        onChange={(checked) => update({ sensor: checked })}
      />
      <NumberField label="Velocity X" value={(collision as any).velocityX ?? 0} onCommit={(value) => update({ velocityX: value })} />
      <NumberField label="Velocity Y" value={(collision as any).velocityY ?? 0} onCommit={(value) => update({ velocityY: value })} />
      <NumberField label="Acceleration X" value={(collision as any).accelerationX ?? 0} onCommit={(value) => update({ accelerationX: value })} />
      <NumberField label="Acceleration Y" value={(collision as any).accelerationY ?? 0} onCommit={(value) => update({ accelerationY: value })} />
      <NumberField label="Max Velocity" value={(collision as any).maxVelocity ?? 0} min={0} onCommit={(value) => update({ maxVelocity: value })} />
      <NumberField label="Mass" value={(collision as any).mass ?? 1} min={0.01} step={0.1} onCommit={(value) => update({ mass: value })} />
    </div>
  );
}

function TextSection({ entity, onUpdateComponent }: ComponentEditorProps) {
  const text = getComponents(entity).get('text') as Record<string, any> | undefined;
  if (!text) return null;
  const update = (patch: Record<string, any>) => onUpdateComponent('text', { ...text, ...patch });
  const contentError = String(text.content ?? '').trim() ? undefined : 'Text content is required.';
  const colorError = text.color && !HEX_COLOR_RE.test(text.color) ? 'Use #RRGGBB or #RRGGBBAA.' : undefined;

  return (
    <div className="inspector-section">
      <h3>Text</h3>
      <div className="property-row">
        <label>Content</label>
        <textarea
          value={String(text.content ?? '')}
          className={fieldClass(Boolean(contentError))}
          onChange={(e) => update({ content: e.target.value })}
        />
        <FieldError message={contentError} />
      </div>
      <NumberField label="Font Size" value={text.fontSize ?? 16} min={1} onCommit={(value) => update({ fontSize: value })} />
      <TextField label="Color" value={text.color ?? '#ffffff'} error={colorError} onCommit={(value) => update({ color: value })} />
      <TextField label="Font Family" value={text.fontFamily ?? 'sans-serif'} onCommit={(value) => update({ fontFamily: value })} />
    </div>
  );
}

function MovementSection({ entity, onUpdateComponent }: ComponentEditorProps) {
  const movement = getComponents(entity).get('movement') as Record<string, any> | undefined;
  if (!movement) return null;
  const update = (patch: Record<string, any>) => onUpdateComponent('movement', { ...movement, ...patch });
  return (
    <div className="inspector-section">
      <h3>Movement</h3>
      <NumberField label="VX" value={movement.vx ?? 0} onCommit={(value) => update({ vx: value })} />
      <NumberField label="VY" value={movement.vy ?? 0} onCommit={(value) => update({ vy: value })} />
      <NumberField label="Speed" value={movement.speed ?? 0} min={0} onCommit={(value) => update({ speed: value })} />
    </div>
  );
}

function AISection({ entity, onUpdateComponent }: ComponentEditorProps) {
  const ai = getComponents(entity).get('ai') as Record<string, any> | undefined;
  if (!ai) return null;
  const update = (patch: Record<string, any>) => onUpdateComponent('ai', { ...ai, ...patch });
  return (
    <div className="inspector-section">
      <h3>AI</h3>
      <div className="property-row">
        <label>Type</label>
        <select value={AI_TYPES.includes(ai.type) ? ai.type : 'idle'} onChange={(e) => update({ type: e.target.value })}>
          {AI_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>
      <NumberField label="Patrol Speed" value={ai.patrolSpeed ?? ai.speed ?? 0} min={0} onCommit={(value) => update({ patrolSpeed: value })} />
    </div>
  );
}

function ParticlesSection({ entity, onUpdateComponent }: ComponentEditorProps) {
  const particles = getComponents(entity).get('particles') as Record<string, any> | undefined;
  if (!particles) return null;
  const update = (patch: Record<string, any>) => onUpdateComponent('particles', { ...particles, ...patch });
  const colorError = particles.color && !HEX_COLOR_RE.test(particles.color) ? 'Use #RRGGBB or #RRGGBBAA.' : undefined;

  return (
    <div className="inspector-section">
      <h3>Particles</h3>
      <NumberField label="Rate" value={particles.rate ?? 10} min={0} onCommit={(value) => update({ rate: value })} />
      <NumberField label="Lifespan" value={particles.lifespan ?? 1000} min={0} onCommit={(value) => update({ lifespan: value })} />
      <NumberField label="Speed" value={particles.speed ?? 0} min={0} onCommit={(value) => update({ speed: value })} />
      <TextField label="Color" value={particles.color ?? '#f97316'} error={colorError} onCommit={(value) => update({ color: value })} />
    </div>
  );
}

function CollectibleSection({ entity, onUpdateComponent }: ComponentEditorProps) {
  const collectible = getComponents(entity).get('collectible') as Record<string, any> | undefined;
  if (!collectible) return null;
  const update = (patch: Record<string, any>) => onUpdateComponent('collectible', { ...collectible, ...patch });
  return (
    <div className="inspector-section">
      <h3>Collectible</h3>
      <TextField label="Type" value={collectible.type ?? ''} required onCommit={(value) => update({ type: value })} />
      <NumberField label="Value" value={collectible.value ?? 0} onCommit={(value) => update({ value })} />
      <TextField label="Name" value={collectible.name ?? ''} onCommit={(value) => update({ name: value })} />
    </div>
  );
}

function ContainerSection({ entity, onUpdateComponent }: ComponentEditorProps) {
  const container = getComponents(entity).get('container') as Record<string, any> | undefined;
  if (!container) return null;
  const children = Array.isArray(container.children) ? container.children.join(', ') : '';
  const update = (patch: Record<string, any>) => onUpdateComponent('container', { ...container, ...patch });

  return (
    <div className="inspector-section">
      <h3>Container</h3>
      <TextField
        label="Children"
        value={children}
        onCommit={(value) => update({
          children: value.split(',').map((child) => child.trim()).filter(Boolean),
        })}
      />
    </div>
  );
}

function TweenSection({ entity, onUpdateComponent }: ComponentEditorProps) {
  const tween = getComponents(entity).get('tween') as Record<string, any> | undefined;
  if (!tween) return null;
  const update = (patch: Record<string, any>) => onUpdateComponent('tween', { ...tween, ...patch });

  return (
    <div className="inspector-section">
      <h3>Tween</h3>
      <NumberField label="Duration" value={tween.duration ?? 500} min={0} onCommit={(value) => update({ duration: value })} />
      <TextField label="Ease" value={tween.ease ?? 'linear'} required onCommit={(value) => update({ ease: value })} />
      <NumberField label="Repeat" value={tween.repeat ?? 0} min={-1} onCommit={(value) => update({ repeat: value })} />
    </div>
  );
}

interface ComponentEditorProps {
  entity: Entity;
  onUpdateComponent: (componentType: string, data: Record<string, any>) => void;
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onCommit: (value: number) => void;
}) {
  const hasError = !Number.isFinite(value)
    || (typeof min === 'number' && value < min)
    || (typeof max === 'number' && value > max);
  const rangeHint = hasError
    ? `Value must be ${typeof min === 'number' ? `at least ${min}` : ''}${typeof min === 'number' && typeof max === 'number' ? ' and ' : ''}${typeof max === 'number' ? `at most ${max}` : ''}.`
    : undefined;

  return (
    <div className="property-row">
      <label>{label}</label>
      <div className="inline-controls">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          className={fieldClass(hasError)}
          onChange={(e) => onCommit(clampNumber(Number(e.target.value), min, max))}
        />
        {suffix && <span className="hint">{suffix}</span>}
      </div>
      <FieldError message={rangeHint} />
    </div>
  );
}

function TextField({
  label,
  value,
  required,
  error,
  onCommit,
}: {
  label: string;
  value: string;
  required?: boolean;
  error?: string;
  onCommit: (value: string) => void;
}) {
  const requiredError = required && !value.trim() ? `${label} is required.` : undefined;
  return (
    <div className="property-row">
      <label>{label}</label>
      <input
        type="text"
        value={value}
        className={fieldClass(Boolean(requiredError || error))}
        onChange={(e) => onCommit(e.target.value)}
      />
      <FieldError message={requiredError || error} />
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="property-checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function ComponentsSection({ entity, onRemoveComponent }: {
  entity: Entity;
  onRemoveComponent: (t: string) => void;
}) {
  const comps = getComponents(entity);
  const hiddenComponentEditors = new Set(['playerInput', 'sprite', 'collision', 'transform', 'text', 'movement', 'ai', 'particles', 'collectible', 'container', 'tween']);
  return (
    <div className="inspector-section">
      <h3>Components</h3>
      <div className="component-list">
        {Array.from(comps.keys())
          .filter((key) => !hiddenComponentEditors.has(key))
          .map((componentType) => (
            <div key={componentType} className="component-item">
              <span className="component-name">{componentType}</span>
              <button className="remove-btn" onClick={() => onRemoveComponent(componentType)} title="Remove">
                Remove
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
  const comps = getComponents(entity);
  const allComponents = [
    { id: 'sprite', label: 'Sprite' },
    { id: 'collision', label: 'Collision' },
    { id: 'movement', label: 'Movement' },
    { id: 'ai', label: 'AI' },
    { id: 'collectible', label: 'Collectible' },
    { id: 'tween', label: 'Tween' },
    { id: 'particles', label: 'Particles' },
    { id: 'container', label: 'Container' },
    { id: 'text', label: 'Text' },
  ];

  return (
    <div className="inspector-section">
      <h3>Add Component</h3>
      <div className="component-buttons">
        {allComponents.map(({ id, label }) => (
          <button key={id} onClick={() => onAddComponent(id)} disabled={comps.has(id)}>
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
      <h3>Actions</h3>
      <div className="action-buttons">
        <button className="danger-btn" onClick={() => onDelete(entityId)}>Delete</button>
        <button className="duplicate-btn" onClick={() => onDuplicate(entityId)}>Duplicate</button>
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
      <h3>Entities ({scene?.entities.size || 0})</h3>
      <div className="entity-list">
        {Array.from(scene?.entities.values() || []).map((entity) => (
          <button
            key={entity.id}
            className={`entity-item ${entity.id === selectedEntityId ? 'selected' : ''}`}
            onClick={() => onSelect(entity.id)}
          >
            <span>{entityIcons[entity.type || ''] || '📦'}</span>
            <span className="entity-item-id">{entity.name || entity.id}</span>
            <span className="entity-item-type">{entity.type || 'custom'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
