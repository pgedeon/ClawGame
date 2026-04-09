import React, { useState, useMemo } from 'react';
import {
  Swords, Shield, Map, Bot, Palette, Zap, Code, Layers,
  ChevronRight, Search, BookOpen, Star
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PromptRecipe {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
  icon: LucideIcon;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const PROMPT_RECIPES: PromptRecipe[] = [
  // --- Enemies & Combat ---
  {
    id: 'enemy-archetype',
    title: 'Create Enemy Archetype',
    description: 'Generate a new enemy type with behavior, stats, and AI patterns.',
    prompt: 'Create a new enemy archetype called "{name}" with the following traits:\n- Movement pattern: {patrol|chase|stationary|teleport}\n- Attack type: {melee|ranged|area|none}\n- Health: {low|medium|high|boss}\n- Special ability: describe one unique mechanic\nGenerate the entity definition and behavior code.',
    category: 'Combat',
    icon: Swords,
    tags: ['enemy', 'combat', 'ai', 'entity'],
    difficulty: 'intermediate',
  },
  {
    id: 'boss-fight',
    title: 'Design Boss Encounter',
    description: 'Create a multi-phase boss fight with attack patterns and progression.',
    prompt: 'Design a boss encounter for a {genre} game with:\n- 3 distinct attack phases that escalate in difficulty\n- A visual telegraph system so the player can anticipate attacks\n- An enrage timer or mechanic if the fight takes too long\n- A rewarding death animation\nGenerate the boss entity, phase manager, and arena setup code.',
    category: 'Combat',
    icon: Shield,
    tags: ['boss', 'combat', 'encounter', 'phases'],
    difficulty: 'advanced',
  },
  // --- Scenes & Levels ---
  {
    id: 'starter-scene',
    title: 'Build Starter Scene',
    description: 'Generate a complete starting scene with player spawn, boundaries, and atmosphere.',
    prompt: 'Build a starter scene for a {genre} game with:\n- Player spawn point centered in the scene\n- Scene boundaries with collision walls\n- A background layer with parallax-ready structure\n- 3-5 decorative entities (trees, rocks, crates, etc.)\n- Ambient lighting or atmosphere settings\nGenerate the scene definition and entity placement code.',
    category: 'Scenes',
    icon: Map,
    tags: ['scene', 'level', 'starter', 'layout'],
    difficulty: 'beginner',
  },
  {
    id: 'quest-chain',
    title: 'Generate Quest Chain',
    description: 'Create a multi-step quest with objectives, triggers, and rewards.',
    prompt: 'Generate a {length:3|5|7}-step quest chain for an RPG-style game:\n- Each step has a clear objective (kill, collect, escort, discover, defend)\n- Steps connect with narrative dialogue snippets\n- Include trigger conditions for each step\n- Define rewards that escalate appropriately\n- Add an optional side branch at step {n}\nGenerate quest data structures and trigger scripts.',
    category: 'Gameplay',
    icon: BookOpen,
    tags: ['quest', 'rpg', 'narrative', 'objectives'],
    difficulty: 'intermediate',
  },
  // --- AI & Behavior ---
  {
    id: 'ai-companion',
    title: 'Create AI Companion',
    description: 'Build a friendly NPC that follows and assists the player.',
    prompt: 'Create an AI companion character that:\n- Follows the player with smooth pathfinding\n- Maintains a comfortable distance (not too close, not too far)\n- Has 3 contextual actions: heal player, attack nearest enemy, point out secrets\n- Shows idle animations when player stops moving\n- Has a simple personality expressed through small movement quirks\nGenerate companion entity, follow behavior, and action AI code.',
    category: 'AI',
    icon: Bot,
    tags: ['ai', 'npc', 'companion', 'behavior'],
    difficulty: 'advanced',
  },
  {
    id: 'patrol-route',
    title: 'Design Patrol Route',
    description: 'Create a waypoint-based patrol system for NPCs or enemies.',
    prompt: 'Design a patrol route system for an NPC/enemy:\n- Define 4-6 waypoints that form a logical patrol loop\n- The entity pauses briefly at each waypoint (look-around animation)\n- If the player enters a detection radius, switch to chase behavior\n- If the player escapes, return to the nearest waypoint and resume patrol\n- Add a "suspicious" state when player is partially detected\nGenerate patrol data, state machine, and behavior code.',
    category: 'AI',
    icon: Zap,
    tags: ['patrol', 'ai', 'waypoint', 'behavior'],
    difficulty: 'intermediate',
  },
  // --- Assets & Visuals ---
  {
    id: 'concept-to-assets',
    title: 'Concept → Asset List',
    description: 'Turn a game concept into a complete asset inventory with priorities.',
    prompt: 'I want to make a {genre} game called "{title}" with the theme: {theme}\n\nGenerate a complete asset inventory:\n1. List all sprite assets needed (characters, enemies, items, tiles)\n2. List all UI elements needed (menus, HUD, buttons, icons)\n3. List all audio assets (SFX, music, ambient)\n4. Prioritize each asset as P0 (must-have), P1 (important), P2 (nice-to-have)\n5. Suggest which assets can be generated vs need custom art\n\nFormat as a checklist I can use for production tracking.',
    category: 'Assets',
    icon: Palette,
    tags: ['assets', 'planning', 'production', 'checklist'],
    difficulty: 'beginner',
  },
  {
    id: 'sprite-animation',
    title: 'Sprite Animation Set',
    description: 'Define a complete animation set for a character with frame counts and timings.',
    prompt: 'Define a complete sprite animation set for a {type:player|enemy|npc} character in a {genre} game:\n\nRequired animations:\n- Idle (4-6 frames, looping)\n- Walk/Run (6-8 frames, looping)\n- Attack (4-6 frames, one-shot with callback)\n- Hurt/Damage (2-3 frames, flash effect)\n- Death (4-6 frames, one-shot)\n- {genre-specific animation}\n\nFor each animation, specify: frame count, frame duration (ms), loop setting, and transition rules.\nGenerate the animation definition data structure.',
    category: 'Assets',
    icon: Layers,
    tags: ['sprite', 'animation', 'character', 'frames'],
    difficulty: 'intermediate',
  },
  // --- Code & Systems ---
  {
    id: 'mechanic-component',
    title: 'Refactor into Component',
    description: 'Extract a gameplay mechanic into a reusable engine component.',
    prompt: 'Take the following gameplay mechanic and refactor it into a reusable engine component:\n\n{paste existing code or describe mechanic}\n\nThe component should:\n- Accept configuration parameters (speed, range, damage, etc.)\n- Emit events that other systems can subscribe to\n- Be attachable to any entity via the component system\n- Include a reset() method for scene transitions\n- Have clear lifecycle hooks (init, update, destroy)\n\nGenerate the component class and integration example.',
    category: 'Code',
    icon: Code,
    tags: ['component', 'refactor', 'architecture', 'reusable'],
    difficulty: 'advanced',
  },
  {
    id: 'powerup-system',
    title: 'Power-Up System',
    description: 'Create a pickup-based power-up system with effects and durations.',
    prompt: 'Create a power-up system for a {genre} game:\n- Define 5 power-up types (speed boost, shield, extra damage, health, special ability)\n- Each power-up has: duration, visual effect, stat modification, cooldown before re-pickup\n- Power-ups spawn from destroyed enemies or hidden areas\n- Show active power-ups in the HUD with remaining duration\n- Stack rules: same type refreshes, different types can overlap\nGenerate pickup entities, buff manager, and HUD integration code.',
    category: 'Gameplay',
    icon: Star,
    tags: ['powerup', 'pickup', 'buff', 'system'],
    difficulty: 'intermediate',
  },
];

export const RECIPE_CATEGORIES = [...new Set(PROMPT_RECIPES.map(r => r.category))];

interface PromptRecipeLibraryProps {
  onSelect: (recipe: PromptRecipe) => void;
  /** If provided, filter to context-relevant recipes */
  context?: string;
}

export function PromptRecipeLibrary({ onSelect, context }: PromptRecipeLibraryProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    let results = PROMPT_RECIPES;

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some(t => t.includes(q))
      );
    }

    if (selectedCategory) {
      results = results.filter(r => r.category === selectedCategory);
    }

    return results;
  }, [search, selectedCategory]);

  // Show top 6 by default, expandable
  const visible = showAll ? filtered : filtered.slice(0, 6);

  return (
    <div className="recipe-library">
      <div className="recipe-header">
        <span className="recipe-title">
          <BookOpen size={13} />
          Prompt Recipes
        </span>
      </div>

      <div className="recipe-search">
        <Search size={12} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search recipes..."
          className="recipe-search-input"
        />
      </div>

      <div className="recipe-categories">
        <button
          className={`recipe-cat-btn ${!selectedCategory ? 'active' : ''}`}
          onClick={() => setSelectedCategory(null)}
        >
          All
        </button>
        {RECIPE_CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`recipe-cat-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="recipe-list">
        {visible.map(recipe => {
          const Icon = recipe.icon;
          return (
            <button
              key={recipe.id}
              className="recipe-item"
              onClick={() => onSelect(recipe)}
              title={recipe.description}
            >
              <div className="recipe-item-icon">
                <Icon size={14} />
              </div>
              <div className="recipe-item-body">
                <span className="recipe-item-title">{recipe.title}</span>
                <span className="recipe-item-desc">{recipe.description}</span>
              </div>
              <ChevronRight size={12} className="recipe-item-arrow" />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="recipe-empty">No recipes match your search.</div>
        )}
      </div>

      {filtered.length > 6 && (
        <button
          className="recipe-show-more"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show less' : `Show ${filtered.length - 6} more`}
        </button>
      )}
    </div>
  );
}
