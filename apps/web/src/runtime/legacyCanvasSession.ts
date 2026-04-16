/**
 * @clawgame/web - Legacy Canvas Preview Runtime
 *
 * Bridges the React hook world with the engine runtime system.
 * Handles canvas setup, input routing, game loop, and tower-defense integration.
 */

import type { MutableRefObject } from 'react';
import type {
  ReplayRecorder,
  ReplayPlayer,
  ReplayData,
} from '../rpg/replay';
import {
  createTowerDefenseState,
  updateTowerDefenseFrame,
  type TowerDefenseState,
  type TowerDefenseTower,
  type TowerDefenseProjectile,
  type TowerDefenseEntity,
  type TowerType,
  validateTowerPlacement,
  createTowerDefenseTowerAt,
  getMapLayout,
  getMapWaypoints,
  getTowerDefenseWaves,
  TOWER_PLACEMENT_RADIUS,
} from '../utils/previewTowerDefense';

export type LegacyCanvasPreviewSessionOptions = {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  animationRef: MutableRefObject<number | null>;
  gameStatsRef: MutableRefObject<{ fps: number; entities: number; memory: string }>;
  highScoreRef: MutableRefObject<number>;
  gameLoopState: MutableRefObject<{
    gameStarted: boolean;
    gamePaused: boolean;
    gameOver: boolean;
    victory: boolean;
  }>;
  activeScene: MutableRefObject<any>;
  projectGenre: string;
  gameStarted: boolean;
  gamePaused: boolean;
  gameOver: boolean;
  victory: boolean;
  setGameStats: React.Dispatch<React.SetStateAction<{ fps: number; entities: number; memory: string }>>;
  setPlayerScore: React.Dispatch<React.SetStateAction<number>>;
  setPlayerHealth: React.Dispatch<React.SetStateAction<number>>;
  setPlayerMana: React.Dispatch<React.SetStateAction<number>>;
  setCollectedRunes: React.Dispatch<React.SetStateAction<string[]>>;
  setTimeElapsed: React.Dispatch<React.SetStateAction<number>>;
  setActivePanel: (p: any) => void;
  setTowerDefenseOverlayState: React.Dispatch<React.SetStateAction<any>>;
  inventoryRef: MutableRefObject<any>;
  questMgrRef: MutableRefObject<any>;
  dialogueMgrRef: MutableRefObject<any>;
  spellMgrRef: MutableRefObject<any>;
  combatLogRef?: MutableRefObject<any>;
  replayRecorderRef: MutableRefObject<ReplayRecorder | null>;
  replayPlayerRef: MutableRefObject<ReplayPlayer | null>;
  replayDataRef: MutableRefObject<ReplayData | null>;
  pendingReplayStepMsRef: MutableRefObject<number>;
  syncRPGState: () => void;
  handleSave: () => void;
  runtimeHostRef: MutableRefObject<HTMLDivElement | null>;
};

export function runLegacyCanvasPreviewSession(options: LegacyCanvasPreviewSessionOptions): () => void {
  const {
    canvasRef,
    animationRef,
    gameStatsRef,
    highScoreRef,
    gameLoopState,
    activeScene,
    projectGenre,
    gameStarted,
    gamePaused,
    gameOver,
    victory,
    setGameStats,
    setPlayerScore,
    setPlayerHealth,
    setPlayerMana,
    setCollectedRunes,
    setTimeElapsed,
    setActivePanel,
    setTowerDefenseOverlayState,
    inventoryRef,
    questMgrRef,
    dialogueMgrRef,
    spellMgrRef,
    combatLogRef,
    replayRecorderRef,
    replayPlayerRef,
    replayDataRef,
    pendingReplayStepMsRef,
    syncRPGState,
    handleSave,
    runtimeHostRef,
  } = options;

  // Early return if canvas is not available
  const canvas = canvasRef.current;
  if (!canvas) {
    return () => {};
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return () => {};
  }

  const isTowerDefense = projectGenre === 'tower-defense';
  let tdState: TowerDefenseState | null = null;
  let tdTowers: TowerDefenseTower[] = [];
  let tdProjectiles: TowerDefenseProjectile[] = [];
  let tdEntities = new Map<string, TowerDefenseEntity>();
  let lastFrameTime = performance.now();
  let mana = 100;
  let selectedTowerType: TowerType = 'basic';

  // Tower defense initialization
  if (isTowerDefense) {
    const scene = activeScene.current || {};
    const layout = getMapLayout(scene);
    const waypoints = getMapWaypoints(layout, canvas.width, canvas.height);
    tdState = createTowerDefenseState(20, layout, canvas.width, canvas.height);
    
    // Initialize overlay state
    setTowerDefenseOverlayState({
      enabled: true,
      selectedTowerType: 'basic',
      feedback: null,
    });
  }

  // Mouse click handler for tower placement
  const handleCanvasClick = (e: MouseEvent) => {
    if (!isTowerDefense || !gameStarted || gamePaused || gameOver || victory || !tdState) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Check for existing tower click
    for (const tower of tdTowers) {
      if (Math.hypot(x - tower.x, y - tower.y) < TOWER_PLACEMENT_RADIUS) {
        // Tower clicked - could implement upgrade/sell UI here
        return;
      }
    }

    // Get core position from entities
    const core = tdEntities.get('core-bean') || tdEntities.get('magic-bean') || tdEntities.get('player');
    const corePosition = core ? { x: core.transform.x, y: core.transform.y } : null;

    // Validate placement
    const validation = validateTowerPlacement({
      x, y,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      towers: tdTowers,
      mapLayout: tdState.mapLayout,
      corePosition,
    });

    if (!validation.valid) {
      const messages: Record<string, string> = {
        bounds: 'Cannot place tower outside the map',
        path: 'Cannot place tower on enemy path',
        overlap: 'Cannot overlap existing towers',
        core: 'Cannot place tower on the core',
      };
      setTowerDefenseOverlayState({
        enabled: true,
        selectedTowerType,
        feedback: { message: messages[validation.reason!] || 'Invalid placement', kind: 'error' },
      });
      setTimeout(() => {
        setTowerDefenseOverlayState({ enabled: true, selectedTowerType, feedback: null });
      }, 2000);
      return;
    }

    // Create tower
    const tower = createTowerDefenseTowerAt({ x, y }, selectedTowerType, Date.now());
    if (mana >= tower.baseCost) {
      tdTowers.push(tower);
      mana -= tower.baseCost;
      setPlayerMana(mana);
    } else {
      setTowerDefenseOverlayState({
        enabled: true,
        selectedTowerType,
        feedback: { message: 'Not enough mana!', kind: 'error' },
      });
      setTimeout(() => {
        setTowerDefenseOverlayState({ enabled: true, selectedTowerType, feedback: null });
      }, 2000);
    }
  };

  canvas.addEventListener('click', handleCanvasClick);

  // Tower defense update function
  const updateTowerDefense = (currentTime: number, deltaTime: number) => {
    if (!tdState) return;

    const scene = activeScene.current || {};
    const waves = getTowerDefenseWaves(scene);
    
    // Update game state
    const result = updateTowerDefenseFrame({
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      currentTime,
      deltaTime,
      entities: tdEntities,
      towers: tdTowers,
      projectiles: tdProjectiles,
      state: tdState,
      waves,
      onEnemyDefeated: (enemy, reward) => {
        mana += reward;
        setPlayerMana(mana);
        const currentScore = gameStatsRef.current.fps || 0;
        const enemyScore = enemy.scoreValue ?? 0;
        const newScore = currentScore + enemyScore;
        setPlayerScore(newScore + reward);
        if (newScore > highScoreRef.current) {
          highScoreRef.current = newScore;
        }
      },
      random: Math.random,
    });

    // Update health and game state
    setPlayerHealth(tdState.coreHealth);
    
    if (result.gameOver) {
      gameLoopState.current.gameOver = true;
      setTowerDefenseOverlayState({ enabled: false, selectedTowerType, feedback: null });
    }
    
    if (result.victory) {
      gameLoopState.current.victory = true;
      setTowerDefenseOverlayState({ enabled: false, selectedTowerType, feedback: null });
    }
  };

  // Draw tower defense elements
  const drawTowerDefense = () => {
    if (!tdState) return;

    // Draw path
    ctx.strokeStyle = '#5c4b3a';
    ctx.lineWidth = 40;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const waypoints = tdState.waypoints;
    if (waypoints.length > 0) {
      ctx.moveTo(waypoints[0].x, waypoints[0].y);
      for (let i = 1; i < waypoints.length; i++) {
        ctx.lineTo(waypoints[i].x, waypoints[i].y);
      }
    }
    ctx.stroke();

    // Draw core
    const core = tdEntities.get('core-bean') || tdEntities.get('magic-bean') || tdEntities.get('player');
    if (core) {
      const cx = core.transform.x;
      const cy = core.transform.y;
      const cr = 20;
      
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☕', cx, cy);
      
      // Core health
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${tdState.coreHealth}/${tdState.maxCoreHealth}`, cx, cy + cr + 15);
    }

    // Draw towers
    for (const tower of tdTowers) {
      const tr = 18;
      
      // Tower body
      ctx.fillStyle = tower.color;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tr, 0, Math.PI * 2);
      ctx.fill();
      
      // Tower icon
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icons: Record<TowerType, string> = {
        basic: '☕',
        cannon: '💣',
        frost: '❄️',
        lightning: '⚡',
      };
      ctx.fillText(icons[tower.towerType], tower.x, tower.y);
      
      // Upgrade level indicator
      if (tower.upgradeLevel > 0) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`+${tower.upgradeLevel}`, tower.x + tr - 5, tower.y - tr + 8);
      }
      
      // Range indicator for selected tower
      if (tower.towerType === selectedTowerType) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw enemies
    for (const entity of tdEntities.values()) {
      if (entity.type !== 'enemy') continue;
      
      const size = (entity.width || 24) / 2;
      const ex = entity.transform.x;
      const ey = entity.transform.y;
      
      // Enemy body
      ctx.fillStyle = entity.color || '#fb923c';
      ctx.beginPath();
      ctx.arc(ex, ey, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Slow effect
      if (entity.slowedUntil && entity.slowedUntil > Date.now()) {
        ctx.fillStyle = 'rgba(96, 165, 250, 0.3)';
        ctx.beginPath();
        ctx.arc(ex, ey, size + 3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Hit flash
      if (entity.hitFlash && entity.hitFlash > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(ex, ey, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Health bar
      const health = entity.health || 0;
      const maxHealth = entity.maxHealth || 1;
      if (health < maxHealth) {
        const barW = size * 2;
        const barH = 4;
        const barX = ex - size;
        const barY = ey - size - 8;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(barX, barY, barW, barH);
        
        const healthPct = Math.max(0, health / maxHealth);
        ctx.fillStyle = healthPct > 0.5 ? '#22c55e' : healthPct > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(barX, barY, barW * healthPct, barH);
      }
    }

    // Draw projectiles
    for (const proj of tdProjectiles) {
      const pr = 5;
      ctx.fillStyle = proj.color || '#ffffff';
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw wave countdown
    if (tdState.waveCountdown > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.ceil(tdState.waveCountdown).toString(), canvas.width / 2, canvas.height / 2);
    }

    // Draw wave message
    if (tdState.waveMessageTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(tdState.waveMessage, canvas.width / 2, 50);
    }
  };

  // Game loop
  const gameLoop = (timestamp: number) => {
    if (!gameStarted) return;
    if (gamePaused || gameOver || victory) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const deltaTime = Math.min((timestamp - lastFrameTime) / 1000, 0.1);
    lastFrameTime = timestamp;

    // Clear canvas
    ctx.fillStyle = isTowerDefense ? '#2d1f1a' : '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isTowerDefense && tdState) {
      // Update tower defense
      updateTowerDefense(timestamp, deltaTime * 1000);
      
      // Draw tower defense
      drawTowerDefense();
      
      // Update game stats
      setGameStats({
        fps: Math.round(1 / deltaTime),
        entities: tdEntities.size + tdTowers.length + tdProjectiles.length,
        memory: '0MB',
      });
    } else {
      // Draw regular entities
      const entities = activeScene.current?.entities ?? [];
      let entityArray: any[] = [];
      if (entities instanceof Map) {
        entityArray = Array.from(entities.values());
      } else if (Array.isArray(entities)) {
        entityArray = entities;
      } else if (entities.entities instanceof Map) {
        entityArray = Array.from(entities.entities.values());
      } else if (Array.isArray(entities.entities)) {
        entityArray = entities.entities;
      }
      
      for (const entity of entityArray) {
        if (!entity) continue;

        const transform = (entity as any).transform ?? { x: 0, y: 0 };
        const x = transform.x ?? 0;
        const y = transform.y ?? 0;
        const width = (entity as any).width ?? 32;
        const height = (entity as any).height ?? 32;
        const type = (entity as any).type ?? 'unknown';

        ctx.fillStyle = getEntityColor(type);
        ctx.fillRect(x - width / 2, y - height / 2, width, height);

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(type, x, y - height / 2 - 5);

        const health = (entity as any).health ?? 0;
        const maxHealth = (entity as any).maxHealth ?? 0;
        if (type === 'enemy' && maxHealth > 0 && health < maxHealth) {
          const barW = width;
          const barH = 5;
          const barY = -height / 2 - 12;
          const pct = health / maxHealth;
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(x - barW / 2, y + barY, barW, barH);
          ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#eab308' : '#ef4444';
          ctx.fillRect(x - barW / 2, y + barY, barW * pct, barH);
          ctx.fillStyle = '#ffffff';
          ctx.font = '9px sans-serif';
          ctx.fillText(`${health}/${maxHealth}`, x, y + barY + barH + 10);
        }
      }

      setGameStats({ fps: Math.round(1 / deltaTime), entities: entityArray.length, memory: '0MB' });
    }

    setTimeElapsed(prev => prev + deltaTime);
    animationRef.current = requestAnimationFrame(gameLoop);
  };

  // Start game loop
  animationRef.current = requestAnimationFrame(gameLoop);

  // Cleanup function
  return () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    canvas.removeEventListener('click', handleCanvasClick);
  };
}

function getEntityColor(type: string): string {
  const colors: Record<string, string> = {
    player: '#4ade80',
    enemy: '#f87171',
    obstacle: '#9ca3af',
    platform: '#6366f1',
    'td-enemy': '#fb923c',
    core: '#a855f7',
  };
  return colors[type] ?? '#ffffff';
}
