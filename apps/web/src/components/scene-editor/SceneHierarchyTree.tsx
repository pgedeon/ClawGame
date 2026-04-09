/**
 * @clawgame/web - Scene Hierarchy Tree
 * A collapsible tree view of scene entities with:
 * - Entity type icons (player, enemy, collectible, etc.)
 * - Click to select
 * - Visibility toggle (eye icon)
 * - Entity count badge
 * - Keyboard navigation (arrow keys, enter to select)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, ChevronRight, ChevronDown } from 'lucide-react';

interface EntityNode {
  id: string;
  entityType: string; // inferred type: player, enemy, collectible, etc.
  components: string[]; // component names for display
}

interface SceneHierarchyTreeProps {
  entities: EntityNode[];
  selectedEntityId: string | null;
  onSelectEntity: (entityId: string | null) => void;
}

// Entity type icons and colors
const ENTITY_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  player:      { icon: '🎮', color: '#3b82f6', label: 'Player' },
  enemy:       { icon: '👾', color: '#ef4444', label: 'Enemy' },
  collectible: { icon: '🪙', color: '#f59e0b', label: 'Collectible' },
  platform:    { icon: '▬', color: '#64748b', label: 'Platform' },
  wall:        { icon: '🧱', color: '#78716c', label: 'Wall' },
  npc:         { icon: '💬', color: '#22c55e', label: 'NPC' },
  unknown:     { icon: '📦', color: '#8b5cf6', label: 'Entity' },
};

/**
 * Infer entity type from its components.
 */
export function inferEntityType(components: string[]): string {
  const compSet = new Set(components);

  if (compSet.has('playerInput')) return 'player';
  if (compSet.has('ai')) return 'enemy';
  if (compSet.has('collision')) {
    // Check if it has movement (likely player/enemy), otherwise it's a platform/wall
    if (compSet.has('movement') && !compSet.has('playerInput')) return 'enemy';
  }
  // Default: check component hints
  if (compSet.has('movement')) return 'player';
  if (compSet.has('collision')) return 'wall';

  return 'unknown';
}

/**
 * Group entities by inferred type for tree structure.
 */
function groupEntitiesByType(entities: EntityNode[]): Map<string, EntityNode[]> {
  const groups = new Map<string, EntityNode[]>();

  for (const entity of entities) {
    const type = entity.entityType || inferEntityType(entity.components);
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type)!.push(entity);
  }

  return groups;
}

export function SceneHierarchyTree({
  entities,
  selectedEntityId,
  onSelectEntity,
}: SceneHierarchyTreeProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [hiddenEntities, setHiddenEntities] = useState<Set<string>>(new Set());
  const [isFullyExpanded, setIsFullyExpanded] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const groups = groupEntitiesByType(entities);

  // Toggle group collapse
  const toggleGroup = (type: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Toggle entity visibility
  const toggleVisibility = (e: React.MouseEvent, entityId: string) => {
    e.stopPropagation();
    setHiddenEntities(prev => {
      const next = new Set(prev);
      if (next.has(entityId)) {
        next.delete(entityId);
      } else {
        next.add(entityId);
      }
      return next;
    });
  };

  // Toggle all groups
  const toggleAll = () => {
    if (isFullyExpanded) {
      setCollapsedGroups(new Set(groups.keys()));
    } else {
      setCollapsedGroups(new Set());
    }
    setIsFullyExpanded(!isFullyExpanded);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const allEntityIds = entities.map(ent => ent.id);
    const currentIndex = selectedEntityId ? allEntityIds.indexOf(selectedEntityId) : -1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < allEntityIds.length - 1) {
          onSelectEntity(allEntityIds[currentIndex + 1]);
        } else if (currentIndex === -1 && allEntityIds.length > 0) {
          onSelectEntity(allEntityIds[0]);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          onSelectEntity(allEntityIds[currentIndex - 1]);
        }
        break;
      case 'Enter':
      case ' ':
        // Already selected via arrow keys — no-op
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
        <span className="hierarchy-count">{entities.length}</span>
      </div>

      {entities.length === 0 ? (
        <div className="hierarchy-empty">
          <p>No entities in scene</p>
          <p className="hint">Use Add Entity to create objects</p>
        </div>
      ) : (
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
                      const isHidden = hiddenEntities.has(entity.id);

                      return (
                        <button
                          key={entity.id}
                          className={`hierarchy-entity ${isSelected ? 'selected' : ''} ${isHidden ? 'hidden' : ''}`}
                          onClick={() => onSelectEntity(entity.id)}
                          role="treeitem"
                          aria-selected={isSelected}
                          aria-label={`${entity.id} (${typeInfo.label})`}
                        >
                          <span className="entity-type-dot" style={{ background: typeInfo.color }} />
                          <span className="entity-name">{entity.id}</span>
                          <button
                            className={`visibility-toggle ${isHidden ? 'is-hidden' : ''}`}
                            onClick={(e) => toggleVisibility(e, entity.id)}
                            title={isHidden ? 'Show entity' : 'Hide entity'}
                            aria-label={isHidden ? `Show ${entity.id}` : `Hide ${entity.id}`}
                          >
                            {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
