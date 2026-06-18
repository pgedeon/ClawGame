/**
 * @clawgame/shared - Game templates and presets
 */

export const GAME_TEMPLATES = {
  PLATFORMER: {
    name: 'Platformer',
    description: 'Classic side-scrolling platform game',
    entities: [
      { type: 'player', components: ['transform', 'sprite', 'movement', 'collision', 'stats'] },
      { type: 'enemy', components: ['transform', 'sprite', 'movement', 'collision', 'stats', 'ai'] },
      { type: 'platform', components: ['transform', 'collision'] },
    ],
  },
  RPG: {
    name: 'RPG',
    description: 'Role-playing game with turn-based combat',
    entities: [
      { type: 'hero', components: ['transform', 'sprite', 'collision', 'stats', 'input'] },
      { type: 'enemy', components: ['transform', 'sprite', 'collision', 'stats', 'ai'] },
      { type: 'npc', components: ['transform', 'sprite', 'dialogue'] },
    ],
  },
  SHOOTER: {
    name: 'Shooter',
    description: 'Top-down shooter game',
    entities: [
      { type: 'player', components: ['transform', 'sprite', 'movement', 'collision', 'weapon'] },
      { type: 'enemy', components: ['transform', 'sprite', 'movement', 'collision', 'stats', 'ai', 'weapon'] },
      { type: 'projectile', components: ['transform', 'projectile'] },
    ],
  },
};
