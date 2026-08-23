/**
 * Canonical template scene JSON sources for @clawgame/web project templates.
 *
 * Single source of truth shared by:
 * - CreateProjectPage (writes scenes/main-scene.json when creating a project)
 * - Engine integration tests (packages/engine headless tick harness)
 *
 * Extracted verbatim from CreateProjectPage.tsx inline objects.
 * NOTE: entities intentionally ship WITHOUT the runtime `type` field;
 * SceneLoader consumers infer or tolerate absence (see toRuntimeEntity).
 */

export interface TemplateSceneEntity {
  id: string;
  transform: { x: number; y: number; scaleX: number; scaleY: number; rotation: number };
  components: Record<string, unknown>;
}

export interface TemplateScene {
  name: string;
  entities: TemplateSceneEntity[];
}

/** Keyed by CreateProjectPage template id. */
export const templateScenes: Record<'platformer' | 'topdown' | 'dialogue', TemplateScene> = {
  platformer: {
  name: 'Main Scene',
  entities: [
    {
      id: 'player-1',
      transform: { x: 100, y: 350, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        playerInput: true,
        movement: { vx: 0, vy: 0, speed: 200, jumpSpeed: 450, gravity: 900 },
        sprite: { width: 32, height: 48, color: '#3b82f6' },
        physics: { type: 'dynamic', friction: 0.1, restitution: 0 },
        collision: { width: 32, height: 48, type: 'player' }
      }
    },
    {
      id: 'platform-ground',
      transform: { x: 400, y: 480, scaleX: 12, scaleY: 1, rotation: 0 },
      components: {
        platform: true,
        sprite: { width: 80, height: 32, color: '#64748b' },
        collision: { width: 960, height: 32, type: 'solid' }
      }
    },
    {
      id: 'platform-mid-1',
      transform: { x: 280, y: 370, scaleX: 3, scaleY: 1, rotation: 0 },
      components: {
        platform: true,
        sprite: { width: 120, height: 24, color: '#78716c' },
        collision: { width: 120, height: 24, type: 'solid' }
      }
    },
    {
      id: 'platform-mid-2',
      transform: { x: 520, y: 310, scaleX: 3, scaleY: 1, rotation: 0 },
      components: {
        platform: true,
        sprite: { width: 120, height: 24, color: '#78716c' },
        collision: { width: 120, height: 24, type: 'solid' }
      }
    },
    {
      id: 'platform-high',
      transform: { x: 700, y: 220, scaleX: 2, scaleY: 1, rotation: 0 },
      components: {
        platform: true,
        sprite: { width: 100, height: 20, color: '#a8a29e' },
        collision: { width: 100, height: 20, type: 'solid' }
      }
    },
    {
      id: 'platform-moving',
      transform: { x: 380, y: 160, scaleX: 2, scaleY: 1, rotation: 0 },
      components: {
        platform: true,
        movingPlatform: { axis: 'x', range: 120, speed: 80 },
        sprite: { width: 96, height: 20, color: '#f59e0b' },
        collision: { width: 96, height: 20, type: 'solid' }
      }
    },
    {
      id: 'platform-end',
      transform: { x: 850, y: 400, scaleX: 3, scaleY: 1, rotation: 0 },
      components: {
        platform: true,
        sprite: { width: 120, height: 24, color: '#78716c' },
        collision: { width: 120, height: 24, type: 'solid' }
      }
    },
    {
      id: 'coin-1',
      transform: { x: 300, y: 330, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        collision: { width: 20, height: 20, type: 'collectible', value: 10 },
        sprite: { width: 20, height: 20, color: '#fbbf24' }
      }
    },
    {
      id: 'coin-2',
      transform: { x: 540, y: 270, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        collision: { width: 20, height: 20, type: 'collectible', value: 10 },
        sprite: { width: 20, height: 20, color: '#fbbf24' }
      }
    },
    {
      id: 'coin-3',
      transform: { x: 720, y: 180, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        collision: { width: 20, height: 20, type: 'collectible', value: 10 },
        sprite: { width: 20, height: 20, color: '#fbbf24' }
      }
    },
    {
      id: 'enemy-1',
      transform: { x: 550, y: 448, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        ai: { type: 'patrol', speed: 80, range: 150, direction: 1 },
        sprite: { width: 32, height: 32, color: '#ef4444' },
        collision: { width: 32, height: 32, type: 'enemy' }
      }
    },
    {
      id: 'goal-flag',
      transform: { x: 870, y: 360, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        collision: { width: 32, height: 48, type: 'goal' },
        sprite: { width: 32, height: 48, color: '#22c55e' }
      }
    }
  ]
  },
  topdown: {
  name: 'Main Scene',
  entities: [
    {
      id: 'player-1',
      transform: { x: 400, y: 350, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        playerInput: true,
        movement: { vx: 0, vy: 0, speed: 250 },
        sprite: { width: 32, height: 32, color: '#10b981' },
        collision: { width: 32, height: 32, type: 'player' }
      }
    },
    {
      id: 'wall-top',
      transform: { x: 400, y: 60, scaleX: 10, scaleY: 1, rotation: 0 },
      components: {
        sprite: { width: 80, height: 32, color: '#57534e' },
        collision: { width: 800, height: 32, type: 'solid' }
      }
    },
    {
      id: 'wall-bottom',
      transform: { x: 400, y: 580, scaleX: 10, scaleY: 1, rotation: 0 },
      components: {
        sprite: { width: 80, height: 32, color: '#57534e' },
        collision: { width: 800, height: 32, type: 'solid' }
      }
    },
    {
      id: 'wall-left',
      transform: { x: 60, y: 320, scaleX: 1, scaleY: 8, rotation: 0 },
      components: {
        sprite: { width: 32, height: 80, color: '#57534e' },
        collision: { width: 32, height: 640, type: 'solid' }
      }
    },
    {
      id: 'wall-right',
      transform: { x: 740, y: 320, scaleX: 1, scaleY: 8, rotation: 0 },
      components: {
        sprite: { width: 32, height: 80, color: '#57534e' },
        collision: { width: 32, height: 640, type: 'solid' }
      }
    },
    {
      id: 'wall-pillar-1',
      transform: { x: 300, y: 250, scaleX: 1, scaleY: 2, rotation: 0 },
      components: {
        sprite: { width: 48, height: 48, color: '#78716c' },
        collision: { width: 48, height: 96, type: 'solid' }
      }
    },
    {
      id: 'wall-pillar-2',
      transform: { x: 540, y: 420, scaleX: 2, scaleY: 1, rotation: 0 },
      components: {
        sprite: { width: 48, height: 48, color: '#78716c' },
        collision: { width: 96, height: 48, type: 'solid' }
      }
    },
    {
      id: 'wall-divider',
      transform: { x: 400, y: 160, scaleX: 3, scaleY: 1, rotation: 0 },
      components: {
        sprite: { width: 80, height: 24, color: '#57534e' },
        collision: { width: 240, height: 24, type: 'solid' }
      }
    },
    {
      id: 'enemy-1',
      transform: { x: 600, y: 200, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        ai: { type: 'chase', speed: 100, detectionRange: 250 },
        sprite: { width: 28, height: 28, color: '#ef4444' },
        collision: { width: 28, height: 28, type: 'enemy' }
      }
    },
    {
      id: 'enemy-2',
      transform: { x: 200, y: 450, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        ai: { type: 'chase', speed: 90, detectionRange: 200 },
        sprite: { width: 28, height: 28, color: '#ef4444' },
        collision: { width: 28, height: 28, type: 'enemy' }
      }
    },
    {
      id: 'enemy-3',
      transform: { x: 650, y: 480, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        ai: { type: 'chase', speed: 110, detectionRange: 280 },
        sprite: { width: 28, height: 28, color: '#dc2626' },
        collision: { width: 28, height: 28, type: 'enemy' }
      }
    },
    {
      id: 'enemy-4',
      transform: { x: 150, y: 150, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        ai: { type: 'chase', speed: 70, detectionRange: 180 },
        sprite: { width: 28, height: 28, color: '#b91c1c' },
        collision: { width: 28, height: 28, type: 'enemy' }
      }
    },
    {
      id: 'powerup-1',
      transform: { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        collision: { width: 24, height: 24, type: 'powerup', powerupType: 'speed' },
        sprite: { width: 24, height: 24, color: '#8b5cf6' }
      }
    },
    {
      id: 'treasure-chest',
      transform: { x: 680, y: 130, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        collision: { width: 36, height: 28, type: 'treasure', value: 100 },
        sprite: { width: 36, height: 28, color: '#d97706' }
      }
    }
  ]
  },
  dialogue: {
  name: 'Main Scene',
  entities: [
    {
      id: 'player-1',
      transform: { x: 400, y: 400, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        playerInput: true,
        movement: { vx: 0, vy: 0, speed: 150 },
        sprite: { width: 32, height: 48, color: '#f59e0b' },
        collision: { width: 32, height: 48, type: 'player' }
      }
    },
    {
      id: 'npc-shopkeeper',
      transform: { x: 250, y: 280, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        npc: true,
        dialogue: {
          id: 'shop',
          messages: [
            "Welcome to my shop, adventurer!",
            "I have potions, scrolls, and rare trinkets.",
            "But everything costs gold... and you look broke."
          ]
        },
        sprite: { width: 32, height: 48, color: '#ec4899' },
        collision: { width: 32, height: 48, type: 'npc' }
      }
    },
    {
      id: 'npc-questgiver',
      transform: { x: 550, y: 220, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        npc: true,
        dialogue: {
          id: 'quest',
          messages: [
            "Hero! The ancient door to the east has been sealed for centuries.",
            "Legend says a golden key lies hidden near the old signpost.",
            "Find the key, open the door, and glory shall be yours!"
          ]
        },
        sprite: { width: 32, height: 48, color: '#8b5cf6' },
        collision: { width: 32, height: 48, type: 'npc' }
      }
    },
    {
      id: 'npc-stranger',
      transform: { x: 180, y: 480, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        npc: true,
        dialogue: {
          id: 'stranger',
          messages: [
            "...",
            "You shouldn't be here. Turn back.",
            "...or don't. I don't care either way."
          ]
        },
        sprite: { width: 32, height: 48, color: '#1e293b' },
        collision: { width: 32, height: 48, type: 'npc' }
      }
    },
    {
      id: 'sign-village',
      transform: { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        interactable: true,
        text: "Welcome to the Village of Whispering Oaks. Beware the sealed door to the east.",
        sprite: { width: 64, height: 48, color: '#78716c' },
        collision: { width: 64, height: 48, type: 'sign' }
      }
    },
    {
      id: 'sign-hint',
      transform: { x: 620, y: 400, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        interactable: true,
        text: "The key glimmers where the shadows grow long. Look near the old sign.",
        sprite: { width: 64, height: 48, color: '#78716c' },
        collision: { width: 64, height: 48, type: 'sign' }
      }
    },
    {
      id: 'locked-door',
      transform: { x: 720, y: 320, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        interactable: true,
        locked: true,
        requiresItem: 'key-golden',
        text: "A massive ancient door. It's locked tight. You need a key.",
        sprite: { width: 48, height: 64, color: '#92400e' },
        collision: { width: 48, height: 64, type: 'door' }
      }
    },
    {
      id: 'key-golden',
      transform: { x: 440, y: 320, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        collision: { width: 16, height: 16, type: 'item', itemId: 'key-golden' },
        sprite: { width: 16, height: 16, color: '#fbbf24' }
      }
    }
  ]
  },
};
