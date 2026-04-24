/**
 * @clawgame/web - Scene Hierarchy Tree
 * Phaser Editor-style entity list with selection, visibility, lock, rename, and duplicate actions.
 */

import React, { useMemo, useState, useRef } from 'react';
import { Eye, EyeOff, ChevronRight, ChevronDown, Lock, Unlock, Copy } from 'lucide-react';
import type { Entity } from '@clawgame/engine';

interface SceneHierarchyTreeProps {
  entities: Entity[];
  selectedEntityId: string | null;
  onSelectEntity: (entityId: string | null) => void;
  onToggleVisibility: (entityId: string) => void;
  onToggleLock: (entityId: string) => void;
  onRenameEntity: (entityId: string, name: string) => void;
  onDuplicateEntity: (entityId: string) => void;
}

const ENTITY_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  player: { icon: '🎮', color: '#3b82f6', label: 'Player' },
  enemy: { icon: '👾', color: '#ef4444', label: 'Enemy' },
  collectible: { icon: '🪙', color: '#f59e0b', label: 'Collectible' },
  obstacle: { icon: '🧱', color: '#78716c', label: 'Obstacle' },
  platform: { icon: '▬', color: '#64748b', label: 'Platform' },
  npc: { icon: '💬', color: '#22c55e', label: 'NPC' },
  custom: { icon: '📦', color: '#8b5cf6', label: 'Custom' },
  unknown: { icon: '📦', color: '#8b5cf6', label: 'Entity' },
};

function getComponentNames(entity: Entity): string[] {
  return Array.from(entity.components instanceof Map
    ? entity.components.keys()
    : Object.keys(entity.components || {}));
}

export function inferEntityType(components: string[]): string {
  const compSet = new Set(components);

  if (compSet.has('playerInput')) return 'player';
  if (compSet.has('ai')) return 'enemy';
  if (compSet.has('movement')) return 'player';
  if (compSet.has('collision')) return 'obstacle';
  return 'unknown';
}

function groupEntitiesByType(entities: Entity[]): Map<string, Entity[]> {
  const groups = new Map<string, Entity[]>();

  for (const entity of entities) {
    const type = entity.type || inferEntityType(getComponentNames(entity));
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push(entity);
  }

  return groups;
}

function buildEntityTree(entities: Entity[]): { roots: Entity[]; childrenMap: Map<string, Entity[]> } {
  const childrenMap = new Map<string, Entity[]>();
  const roots: Entity[] = [];
  const entityMap = new Map(entities.map((e) => [e.id, e]));

  for (const entity of entities) {
    const parentId = (entity as any).parent;
    if (parentId && entityMap.has(parentId)) {
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId)!.push(entity);
    } else {
      roots.push(entity);
    }
  }
  return { roots, childrenMap };
}

export function SceneHierarchyTree({
  entities,
  selectedEntityId,
  onSelectEntity,
  onToggleVisibility,
  onToggleLock,
  onRenameEntity,
  onDuplicateEntity,
}: SceneHierarchyTreeProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grouped' | 'tree'>('grouped');
  const [isFullyExpanded, setIsFullyExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => groupEntitiesByType(entities), [entities]);

  const toggleGroup = (type: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const toggleAll = () => {
    if (isFullyExpanded) setCollapsedGroups(new Set(groups.keys()));
    else setCollapsedGroups(new Set());
    setIsFullyExpanded(!isFullyExpanded);
  };

  const beginRename = (entity: Entity) => {
    setEditingId(entity.id);
    setDraftName(entity.name || entity.id);
  };

  const commitRename = () => {
    if (!editingId) return;
    const nextName = draftName.trim();
    if (nextName) onRenameEntity(editingId, nextName);
    setEditingId(null);
    setDraftName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingId) return;
    const allEntityIds = entities.map(ent => ent.id);
    const currentIndex = selectedEntityId ? allEntityIds.indexOf(selectedEntityId) : -1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < allEntityIds.length - 1) onSelectEntity(allEntityIds[currentIndex + 1]);
        else if (currentIndex === -1 && allEntityIds.length > 0) onSelectEntity(allEntityIds[0]);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) onSelectEntity(allEntityIds[currentIndex - 1]);
        break;
      case 'Escape':
        onSelectEntity(null);
        break;
    }
  };

  return (
    <div
      className="scene-hierarchy-tree"
      ref={containerRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="tree"
      aria-label="Scene entity hierarchy"
    >
      <div className="hierarchy-header">
        <button
          className="hierarchy-toggle-all"
          onClick={toggleAll}
          title={isFullyExpanded ? 'Collapse all' : 'Expand all'}
        >
          {isFullyExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span className="hierarchy-title">Scene Hierarchy</span>
        <button
          className="hierarchy-view-toggle"
          onClick={() => setViewMode(viewMode === 'grouped' ? 'tree' : 'grouped')}
          title={viewMode === 'grouped' ? 'Switch to tree view' : 'Switch to grouped view'}
        >
          {viewMode === 'grouped' ? '☰ Groups' : '🌳 Tree'}
        </button>
        <span className="hierarchy-count">{entities.length}</span>
      </div>

      {entities.length === 0 ? (
        <div className="hierarchy-empty">
          <p>No entities in scene</p>
          <p className="hint">Use Add Entity to create objects</p>
        </div>
      ) : viewMode === 'grouped' ? (
        <div className="hierarchy-groups">
          {Array.from(groups.entries()).map(([type, groupEntities]) => {
            const typeInfo = ENTITY_ICONS[type] || ENTITY_ICONS.unknown;
            const isCollapsed = collapsedGroups.has(type);

            return (
              <div key={type} className="hierarchy-group" role="treeitem">
                <button
                  className="hierarchy-group-header"
                  onClick={() => toggleGroup(type)}
                  aria-expanded={!isCollapsed}
                >
                  <span className="group-chevron">
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </span>
                  <span className="group-icon">{typeInfo.icon}</span>
                  <span className="group-label">{typeInfo.label}s</span>
                  <span className="group-count">{groupEntities.length}</span>
                </button>

                {!isCollapsed && (
                  <div className="hierarchy-group-entities" role="group">
                    {groupEntities.map(entity => {
                      const isSelected = entity.id === selectedEntityId;
                      const isVisible = entity.visible !== false;
                      const isLocked = Boolean(entity.locked);
                      const displayName = entity.name || entity.id;

                      return (
                        <div
                          key={entity.id}
                          className={`hierarchy-entity ${isSelected ? 'selected' : ''} ${!isVisible ? 'hidden-entity' : ''} ${isLocked ? 'locked-entity' : ''}`}
                          role="treeitem"
                          tabIndex={0}
                          aria-selected={isSelected}
                          aria-label={`${displayName} (${typeInfo.label})`}
                          onClick={() => onSelectEntity(entity.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectEntity(entity.id);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            onDuplicateEntity(entity.id);
                          }}
                        >
                          <span className="entity-type-dot" style={{ background: typeInfo.color }} />
                          {editingId === entity.id ? (
                            <input
                              className="hierarchy-rename-input"
                              value={draftName}
                              autoFocus
                              onChange={(e) => setDraftName(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={commitRename}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename();
                                if (e.key === 'Escape') {
                                  setEditingId(null);
                                  setDraftName('');
                                }
                              }}
                            />
                          ) : (
                            <span className="entity-name" onDoubleClick={(e) => {
                              e.stopPropagation();
                              beginRename(entity);
                            }}>
                              {displayName}
                            </span>
                          )}
                          <div className="hierarchy-row-actions">
                            <button
                              className="hierarchy-icon-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleVisibility(entity.id);
                              }}
                              title={isVisible ? 'Hide entity' : 'Show entity'}
                              aria-label={isVisible ? `Hide ${displayName}` : `Show ${displayName}`}
                            >
                              {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                            </button>
                            <button
                              className="hierarchy-icon-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleLock(entity.id);
                              }}
                              title={isLocked ? 'Unlock entity' : 'Lock entity'}
                              aria-label={isLocked ? `Unlock ${displayName}` : `Lock ${displayName}`}
                            >
                              {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                            </button>
                            <button
                              className="hierarchy-icon-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicateEntity(entity.id);
                              }}
                              title="Duplicate entity"
                              aria-label={`Duplicate ${displayName}`}
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="hierarchy-tree">
          {(() => {
            const { roots, childrenMap } = buildEntityTree(entities);
            const renderEntityNode = (entity: Entity, depth: number) => {
              const isSelected = selectedEntityId === entity.id;
              const isVisible = entity.visible !== false;
              const isLocked = Boolean(entity.locked);
              const children = childrenMap.get(entity.id) || [];
              const displayName = entity.name || entity.id;
              const typeInfo = ENTITY_ICONS[entity.type || ''] || ENTITY_ICONS.unknown;
              return (
                <div key={entity.id}>
                  <div
                    className={`hierarchy-entity ${isSelected ? 'selected' : ''} ${!isVisible ? 'hidden-entity' : ''} ${isLocked ? 'locked-entity' : ''}`}
                    style={{ paddingLeft: depth * 16 }}
                    onClick={() => onSelectEntity(entity.id)}
                  >
                    <span className="entity-type-dot" style={{ background: typeInfo.color }} />
                    <span className="entity-name">{displayName}</span>
                    <div className="hierarchy-row-actions">
                      <button className="hierarchy-icon-button" onClick={(e) => { e.stopPropagation(); onToggleVisibility(entity.id); }}>
                        {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                      <button className="hierarchy-icon-button" onClick={(e) => { e.stopPropagation(); onToggleLock(entity.id); }}>
                        {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                      </button>
                    </div>
                  </div>
                  {children.map((child) => renderEntityNode(child, depth + 1))}
                </div>
              );
            };
            return roots.map((root) => renderEntityNode(root, 0));
          })()}
        </div>
      )}
    </div>
  );
}
