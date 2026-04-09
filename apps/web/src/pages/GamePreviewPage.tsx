/**
 * @clawgame/web - Game Preview Page
 * Refactored: uses extracted hooks and components.
 *   - useSceneLoader: scene loading + validation
 *   - useRPGState: RPG managers + reactive state
 *   - RPGPanels: inventory/quests/spellcraft/saveload/dialogue UI
 *   - GameOverlays: start/gameover/victory screens
 *
 * The game canvas loop remains inline (tightly coupled to ctx/entity state).
 */

import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, Skull, Trophy, Heart } from 'lucide-react';
import '../game-preview.css';
import { subscribeNotifications } from '../rpg/notifications';
import { SPELL_RECIPES } from '../rpg/data/recipes';
import type { GameNotification, ElementType, SpellRecipe } from '../rpg/types';

import { InventoryManager } from '../rpg/inventory';
import { QuestManager } from '../rpg/quests';
import { DialogueManager } from '../rpg/dialogue';
import { SpellCraftingManager } from '../rpg/spellcrafting';
import { SaveLoadManager } from '../rpg/saveload';

import { useSceneLoader, type ProjectScene } from '../hooks/useSceneLoader';
import { RPGPanels, type UIPanel, type SaveSlotInfo } from '../components/game/RPGPanels';

/* ─── Types ─── */
interface GameStats { fps: number; entities: number; memory: string; }

/* ─── Entity type constants ─── */
const TYPE_COLORS: Record<string, string> = {
  player: '#3b82f6', enemy: '#ef4444', collectible: '#f59e0b',
  obstacle: '#64748b', npc: '#22c55e', unknown: '#8b5cf6',
};
const TYPE_SIZES: Record<string, [number, number]> = {
  player: [32, 48], enemy: [32, 32], collectible: [16, 16],
  obstacle: [32, 32], npc: [32, 48], unknown: [32, 32],
};

/* ═══════════════════════════════════════════════════════════
   GAME PREVIEW CONTENT
   ═══════════════════════════════════════════════════════════ */
const GamePreviewContent: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const gameStatsRef = useRef<GameStats>({ fps: 60, entities: 0, memory: '0MB' });
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  /* ─── Scene loading (extracted hook) ─── */
  const { loading, error, projectName, scene: projectScene } = useSceneLoader(projectId);

  /* ─── Game state ─── */
  const [gameStats, setGameStats] = useState<GameStats>({ fps: 60, entities: 0, memory: 'N/A' });
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerMana, setPlayerMana] = useState(100);
  const [collectedRunes, setCollectedRunes] = useState<string[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);

  /* RPG panel state */
  const [activePanel, setActivePanel] = useState<UIPanel>('none');
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [questList, setQuestList] = useState<any[]>([]);
  const [dialogueText, setDialogueText] = useState('');
  const [dialogueSpeaker, setDialogueSpeaker] = useState('');
  const [dialoguePortrait, setDialoguePortrait] = useState('');
  const [dialogueChoices, setDialogueChoices] = useState<{ text: string; index: number }[]>([]);
  const [craftingGrid, setCraftingGrid] = useState<(ElementType | null)[][]>([[null,null,null],[null,null,null],[null,null,null]]);
  const [craftResult, setCraftResult] = useState<string | null>(null);
  const [learnedSpells, setLearnedSpells] = useState<any[]>([]);
  const [saveSlots, setSaveSlots] = useState<SaveSlotInfo[]>([]);
  const [questHUDText, setQuestHUDText] = useState('');

  /* RPG managers (refs to survive re-renders) */
  const inventoryRef = useRef(new InventoryManager());
  const questMgrRef = useRef(new QuestManager());
  const dialogueMgrRef = useRef(new DialogueManager());
  const spellMgrRef = useRef(new SpellCraftingManager());
  const saveMgrRef = useRef(new SaveLoadManager());

  /* Game loop mutable state */
  const gameLoopState = useRef<any>(null);

  /* ─── Notification subscription ─── */
  useEffect(() => {
    const unsub = subscribeNotifications((n: GameNotification) => {
      setNotifications(prev => [...prev, n]);
      setTimeout(() => setNotifications(prev => prev.filter(x => x.id !== n.id)), n.duration);
    });
    return unsub;
  }, []);

  /* ─── Sync RPG state to React ─── */
  const syncRPGState = useCallback(() => {
    setInventoryItems(inventoryRef.current.items.map((i: any) => ({ ...i })));
    setQuestList(questMgrRef.current.quests.map((q: any) => ({ ...q, objectives: q.objectives.map((o: any) => ({ ...o })) })));
    setLearnedSpells(spellMgrRef.current.learnedSpells.map((s: any) => ({ ...s })));
    const active = questMgrRef.current.getActiveQuests();
    if (active.length > 0) {
      const q = active[0];
      const obj = q.objectives[0];
      setQuestHUDText(`${q.name}: ${obj.description} (${obj.currentCount}/${obj.requiredCount})`);
    } else {
      setQuestHUDText('');
    }
  }, []);

  const refreshSaveSlots = useCallback(() => {
    setSaveSlots(saveMgrRef.current.listSaves().map((s: any) => ({ id: s.id, name: s.name, timestamp: s.timestamp, playTime: s.playTime })));
  }, []);

  /* ─── RPG Panel handlers ─── */

  const handleUseItem = useCallback((itemId: string) => {
    const item = inventoryRef.current.items.find((i: any) => i.id === itemId);
    if (!item) return;
    if (item.type === 'potion') {
      const heal = item.stats?.heal || 25;
      const player = gameLoopState.current?.getPlayer?.();
      if (player) {
        const currentHealth = gameLoopState.current?.getHealth?.() || 100;
        gameLoopState.current?.setHealth?.(Math.min(100, currentHealth + heal));
      }
    }
    if (item.stackable && item.quantity > 1) {
      item.quantity--;
    } else {
      inventoryRef.current.removeItem(itemId);
    }
    syncRPGState();
  }, [syncRPGState]);

  const handleEquipItem = useCallback((itemId: string) => {
    inventoryRef.current.equipItem(itemId);
    syncRPGState();
  }, [syncRPGState]);

  const handleCraftingCell = useCallback((row: number, col: number) => {
    const elements: (ElementType | null)[] = [null, 'fire', 'water', 'earth', 'air', 'shadow', 'light'];
    const current = craftingGrid[row][col];
    const idx = elements.indexOf(current);
    const next = elements[(idx + 1) % elements.length];
    setCraftingGrid(prev => {
      const g = prev.map(r => [...r]);
      g[row][col] = next;
      // Check recipes
      const recipe = SPELL_RECIPES.find(r => {
        return r.pattern.every((row: any, ri: number) => row.every((cell: any, ci: number) => cell === g[ri][ci]));
      });
      setCraftResult(recipe ? recipe.name : null);
      return g;
    });
  }, [craftingGrid]);

  const handleLearnSpell = useCallback(() => {
    if (!craftResult) return;
    const recipe = SPELL_RECIPES.find(r => r.name === craftResult);
    if (recipe) {
      spellMgrRef.current.learnSpell(recipe);
      syncRPGState();
      setCraftResult(null);
      setCraftingGrid([[null,null,null],[null,null,null],[null,null,null]]);
    }
  }, [craftResult, syncRPGState]);

  const handleAssignHotkey = useCallback((spellId: string, hotkey: number) => {
    spellMgrRef.current.assignHotkey(spellId, hotkey);
    syncRPGState();
  }, [syncRPGState]);

  const handleSave = useCallback((slotId: number) => {
    const player = gameLoopState.current?.getPlayer?.();
    if (!player) return;
    const data = saveMgrRef.current.serializeGameState({
      playerPosition: { x: player.transform.x, y: player.transform.y },
      playerHealth: gameLoopState.current?.getHealth?.() || 100,
      playerScore: gameLoopState.current?.getScore?.() || 0,
      inventory: inventoryRef.current,
      questManager: questMgrRef.current,
      spellManager: spellMgrRef.current,
      dialogueManager: dialogueMgrRef.current,
      collectedRunes: gameLoopState.current?.getCollectedRunes?.() || [],
      defeatedEnemies: gameLoopState.current?.getDefeatedEnemies?.() || [],
      gameTime: gameLoopState.current?.getGameTime?.() || 0,
      entities: gameLoopState.current?.entities,
    });
    saveMgrRef.current.save(slotId, data, slotId === 0 ? 'Quick Save' : `Save ${slotId}`);
    refreshSaveSlots();
  }, [refreshSaveSlots]);

  const handleLoad = useCallback((slotId: number) => {
    const data = saveMgrRef.current.load(slotId);
    if (!data) return;
    const player = gameLoopState.current?.getPlayer?.();
    if (player && data.playerPosition) {
      player.transform.x = data.playerPosition.x;
      player.transform.y = data.playerPosition.y;
    }
    if (data.playerHealth != null) gameLoopState.current?.setHealth?.(data.playerHealth);
    if (data.playerScore != null) gameLoopState.current?.setScore?.(data.playerScore);
    syncRPGState();
  }, [syncRPGState]);

  const handleDeleteSave = useCallback((slotId: number) => {
    saveMgrRef.current.deleteSave(slotId);
    refreshSaveSlots();
  }, [refreshSaveSlots]);

  const handlePauseResume = useCallback(() => {
    setGamePaused(prev => !prev);
    if (gamePaused) setActivePanel('none');
  }, [gamePaused]);

  const handleDialogueChoice = useCallback((index: number | undefined) => {
    if (index !== undefined) {
      dialogueMgrRef.current.advance(index);
    } else {
      dialogueMgrRef.current.advance();
    }
    const line = dialogueMgrRef.current.getCurrentLine();
    if (!line) { setActivePanel('none'); return; }
    setDialogueSpeaker(line.speaker);
    setDialoguePortrait(line.portrait || '💬');
    setDialogueText(line.text);
    const choices = dialogueMgrRef.current.getChoices();
    setDialogueChoices(choices.map((c: any, i: number) => ({ text: c.text, index: i })));
  }, []);

  /* ─── Game controls ─── */

  const handleStartGame = useCallback(() => setGameStarted(true), []);

  const handleRestart = useCallback(() => {
    setGameOver(false);
    setVictory(false);
    setGameStarted(false);
    setGamePaused(false);
    setPlayerScore(0);
    setPlayerHealth(100);
    setPlayerMana(100);
    setCollectedRunes([]);
    setTimeElapsed(0);
    setActivePanel('none');
  }, []);

  const handleBackToEditor = useCallback(() => {
    if (projectId) navigate(`/project/${projectId}/scene-editor`);
  }, [projectId, navigate]);

  /* ─── Game loop ─── */
  useEffect(() => {
    if (!canvasRef.current || !projectScene) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) { canvas.width = container.clientWidth; canvas.height = container.clientHeight; }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    /* Init entities */
    const entities = new Map<string, any>();
    for (const entity of projectScene.entities) {
      const t = entity.transform || { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 };
      const eType = entity.type || 'unknown';
      const defaultSize = TYPE_SIZES[eType] || [32, 32];
      entities.set(entity.id, {
        id: entity.id, type: eType, transform: { ...t },
        components: entity.components || {},
        vx: 0, vy: 0,
        color: entity.components?.sprite?.color || TYPE_COLORS[eType] || '#8b5cf6',
        width: entity.components?.sprite?.width || defaultSize[0],
        height: entity.components?.sprite?.height || defaultSize[1],
        health: entity.components?.stats?.hp || 30,
        maxHealth: entity.components?.stats?.maxHp || 30,
        damage: entity.components?.stats?.damage || 10,
        enemyType: entity.components?.enemyType || entity.components?.ai?.type || 'slime',
        patrolOrigin: { x: t.x, y: t.y },
        patrolOffset: Math.random() * Math.PI * 2,
        hitFlash: 0, facing: 'right',
      });
    }

    const keys: Record<string, boolean> = {};
    const projectiles: any[] = [];
    let frameCount = 0;
    let lastTime = performance.now();
    let lastShotTime = 0;
    let score = 0;
    let health = 100;
    let mana = 100;
    let invincibleTimer = 0;
    let gameTime = 0;
    const collectedRuneIds: string[] = [];
    const defeatedEnemies: string[] = [];

    /* RPG managers */
    const inventory = inventoryRef.current;
    const questMgr = questMgrRef.current;
    const dialogueMgr = dialogueMgrRef.current;
    const spellMgr = spellMgrRef.current;

    if (projectScene.dialogueTrees) {
      projectScene.dialogueTrees.forEach((dt: any) => dialogueMgr.registerTree(dt));
    }

    inventory.addItem({
      id: 'health-potion', name: 'Health Potion', description: 'Restores 25 HP.',
      type: 'potion', rarity: 'common', icon: '🧪', stackable: true, quantity: 2, maxStack: 10,
      stats: { heal: 25 }, usable: true, equippable: false, sellValue: 3,
    });

    /* Store for external access */
    gameLoopState.current = {
      entities, getHealth: () => health, setHealth: (h: number) => { health = h; },
      getMana: () => mana, setMana: (m: number) => { mana = m; },
      getScore: () => score, setScore: (s: number) => { score = s; },
      getGameTime: () => gameTime, getCollectedRunes: () => collectedRuneIds,
      getDefeatedEnemies: () => defeatedEnemies,
      getPlayer: () => entities.get('player') || entities.get('player-1'),
      inventory, questMgr, dialogueMgr, spellMgr, canvas,
    };

    /* ─── Input ─── */
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = true;

      const panelOpen = ['inventory', 'quests', 'spellcraft', 'saveload'].includes(
        document.querySelector('[data-rpg-panel]')?.getAttribute('data-rpg-panel') || 'none'
      );

      if (e.key === 'Escape') {
        setActivePanel(prev => {
          if (prev !== 'none' && prev !== 'dialogue') return 'none';
          if (prev === 'none' && gameStarted && !gameOver && !victory) {
            setGamePaused(true);
            return 'saveload';
          }
          if ((prev as string) === 'saveload' && gamePaused) return 'none';
          return prev;
        });
        return;
      }

      if (e.key === ' ') {
        if (!gameStarted || gamePaused || gameOver || victory || panelOpen) return;
        e.preventDefault();
        const currentTime = performance.now();
        if (currentTime - lastShotTime > 300) {
          const player = entities.get('player') || entities.get('player-1');
          if (player) {
            let dx = 0, dy = 0;
            if (keys['arrowleft'] || keys['a']) dx = -1;
            else if (keys['arrowright'] || keys['d']) dx = 1;
            else if (keys['arrowup'] || keys['w']) dy = -1;
            else if (keys['arrowdown'] || keys['s']) dy = 1;
            else dx = 1;
            if (dx !== 0 && dy !== 0) { const l = Math.sqrt(dx*dx+dy*dy); dx/=l; dy/=l; }
            projectiles.push({
              id: `proj-${Date.now()}-${Math.random()}`,
              x: player.transform.x, y: player.transform.y,
              vx: dx * 500, vy: dy * 500,
              damage: inventory.getWeaponDamage(),
              color: '#fbbf24', createdAt: currentTime,
            });
            lastShotTime = currentTime;
          }
        }
        return;
      }

      if (!gameStarted || gameOver || victory) return;

      if (k === 'i') { e.preventDefault(); setActivePanel(p => p === 'inventory' ? 'none' : 'inventory'); syncRPGState(); return; }
      if (k === 'j') { e.preventDefault(); setActivePanel(p => p === 'quests' ? 'none' : 'quests'); syncRPGState(); return; }
      if (k === 'c') { e.preventDefault(); setActivePanel(p => p === 'spellcraft' ? 'none' : 'spellcraft'); syncRPGState(); return; }
      if (k === 'f5') { e.preventDefault(); handleSave(0); return; }
      if (k === 'tab') {
        e.preventDefault();
        const player = entities.get('player') || entities.get('player-1');
        if (player) {
          const npcs = Array.from(entities.values()).filter((e: any) => e.type === 'npc');
          for (const npc of npcs) {
            const dx = player.transform.x - npc.transform.x;
            const dy = player.transform.y - npc.transform.y;
            if (Math.sqrt(dx*dx+dy*dy) < 80) {
              const treeId = npc.components.npc?.dialogueTreeId;
              if (treeId && dialogueMgr.startDialogue(treeId)) {
                setActivePanel('dialogue');
                const line = dialogueMgr.getCurrentLine();
                if (line) {
                  setDialogueSpeaker(line.speaker);
                  setDialoguePortrait(line.portrait || '💬');
                  setDialogueText(line.text);
                  const choices = dialogueMgr.getChoices();
                  setDialogueChoices(choices.map((c: any, i: number) => ({ text: c.text, index: i })));
                }
                return;
              }
            }
          }
        }
        return;
      }

      // Spell hotkeys
      if (['1','2','3','4','5','6','7','8'].includes(k) && !panelOpen) {
        const hotkey = parseInt(k);
        const spell = spellMgr.castSpell(hotkey);
        if (spell) {
          mana -= spell.manaCost;
          if (mana < 0) mana = 0;
          const player = entities.get('player') || entities.get('player-1');
          if (player) {
            let dx = 0, dy = 0;
            if (keys['arrowleft'] || keys['a']) dx = -1;
            else if (keys['arrowright'] || keys['d']) dx = 1;
            else if (keys['arrowup'] || keys['w']) dy = -1;
            else if (keys['arrowdown'] || keys['s']) dy = 1;
            else dx = 1;
            if (dx !== 0 && dy !== 0) { const l = Math.sqrt(dx*dx+dy*dy); dx/=l; dy/=l; }

            if (spell.effectType === 'heal') {
              health = Math.min(100, health - spell.damage);
            } else if (spell.effectType === 'projectile') {
              projectiles.push({
                id: `spell-${Date.now()}-${Math.random()}`,
                x: player.transform.x, y: player.transform.y,
                vx: dx * spell.projectileSpeed, vy: dy * spell.projectileSpeed,
                damage: spell.damage, color: spell.projectileColor,
                createdAt: performance.now(), isSpell: true,
              });
            }
          }
          syncRPGState();
        }
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    /* ─── Collision helper ─── */
    const checkCollision = (a: any, b: any) => {
      const dx = a.transform.x - b.transform.x;
      const dy = a.transform.y - b.transform.y;
      return Math.sqrt(dx*dx+dy*dy) < (a.width + b.width) / 2;
    };

    /* ─── UPDATE ─── */
    const update = () => {
      if (!gameStarted || gamePaused || gameOver || victory) return;
      const currentTime = performance.now();
      const deltaTime = Math.min(currentTime - lastTime, 50);
      lastTime = currentTime;
      gameTime += deltaTime;
      setTimeElapsed(Math.floor(gameTime / 1000));

      if (invincibleTimer > 0) invincibleTimer -= deltaTime;
      mana = Math.min(100, mana + deltaTime * 0.01);
      spellMgr.tickCooldowns(deltaTime);

      // Update projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        proj.x += proj.vx * (deltaTime / 1000);
        proj.y += proj.vy * (deltaTime / 1000);
        if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
          projectiles.splice(i, 1); continue;
        }
        const enemies = Array.from(entities.values()).filter((e: any) => e.type === 'enemy');
        for (const enemy of enemies) {
          const dx = proj.x - enemy.transform.x;
          const dy = proj.y - enemy.transform.y;
          if (Math.sqrt(dx*dx+dy*dy) < (enemy.width + 10) / 2) {
            enemy.health -= proj.damage;
            enemy.hitFlash = 200;
            projectiles.splice(i, 1);
            if (enemy.health <= 0) {
              score += 50;
              defeatedEnemies.push(enemy.id);
              questMgr.onKill(enemy.enemyType || 'slime');
              syncRPGState();
              entities.delete(enemy.id);
            }
            break;
          }
        }
        if (!projectiles[i]) continue;
        const obstacles = Array.from(entities.values()).filter((e: any) => e.type === 'obstacle');
        for (const obs of obstacles) {
          const dx = proj.x - obs.transform.x;
          const dy = proj.y - obs.transform.y;
          if (Math.sqrt(dx*dx+dy*dy) < (obs.width + 10) / 2) {
            projectiles.splice(i, 1); break;
          }
        }
      }

      // Update entities
      entities.forEach((entity: any, id: string) => {
        if (entity.components?.playerInput) {
          const speed = entity.components?.movement?.speed || 200;
          let newVx = 0, newVy = 0;
          if (keys['arrowleft'] || keys['a']) newVx = -speed;
          if (keys['arrowright'] || keys['d']) newVx = speed;
          if (keys['arrowup'] || keys['w']) newVy = -speed;
          if (keys['arrowdown'] || keys['s']) newVy = speed;
          const obstacles = Array.from(entities.values()).filter((e: any) => e.type === 'obstacle');
          const nextX = entity.transform.x + newVx * (deltaTime / 1000);
          const testX = { ...entity, transform: { ...entity.transform, x: nextX } };
          if (!obstacles.some((o: any) => id !== o.id && checkCollision(testX, o))) entity.transform.x = nextX;
          const nextY = entity.transform.y + newVy * (deltaTime / 1000);
          const testY = { ...entity, transform: { ...entity.transform, y: nextY } };
          if (!obstacles.some((o: any) => id !== o.id && checkCollision(testY, o))) entity.transform.y = nextY;
          const margin = entity.width / 2;
          entity.transform.x = Math.max(margin, Math.min(canvas.width - margin, entity.transform.x));
          entity.transform.y = Math.max(margin, Math.min(canvas.height - margin, entity.transform.y));
          if (newVx > 0) entity.facing = 'right';
          if (newVx < 0) entity.facing = 'left';
        }

        if (entity.type === 'enemy' && gameStarted) {
          const player = entities.get('player') || entities.get('player-1');
          const patrolSpeed = entity.components?.ai?.speed || 50;
          if (player) {
            const dx = player.transform.x - entity.transform.x;
            const dy = player.transform.y - entity.transform.y;
            const dist = Math.sqrt(dx*dx+dy*dy);
            if (dist < 200) {
              entity.transform.x += (dx/dist) * patrolSpeed * 0.6 * (deltaTime/1000);
              entity.transform.y += (dy/dist) * patrolSpeed * 0.6 * (deltaTime/1000);
              if (dist < (entity.width + player.width) / 2 && invincibleTimer <= 0) {
                const defense = inventory.getArmorDefense();
                const dmg = Math.max(1, (entity.damage || 10) - defense);
                health -= dmg;
                invincibleTimer = 1000;
                if (health <= 0) { health = 0; setGameOver(true); }
              }
            } else {
              const t = currentTime / 1000;
              entity.transform.x = entity.patrolOrigin.x + Math.sin(t * (patrolSpeed/100) + entity.patrolOffset) * 100;
              entity.transform.y = entity.patrolOrigin.y + Math.cos(t * (patrolSpeed/80) + entity.patrolOffset * 2) * 80;
            }
          }
          entity.transform.x = Math.max(entity.width/2, Math.min(canvas.width - entity.width/2, entity.transform.x));
          entity.transform.y = Math.max(entity.height/2, Math.min(canvas.height - entity.height/2, entity.transform.y));
          if (entity.hitFlash > 0) entity.hitFlash -= deltaTime;
        }

        if (entity.type === 'collectible' || entity.type === 'item') {
          entity.transform.rotation = (entity.transform.rotation || 0) + deltaTime * 0.003;
        }
      });

      // Collectible pickup
      const player = entities.get('player') || entities.get('player-1');
      if (player) {
        Array.from(entities.values()).filter((e: any) => e.type === 'collectible').forEach((item: any) => {
          const dx = player.transform.x - item.transform.x;
          const dy = player.transform.y - item.transform.y;
          if (Math.sqrt(dx*dx+dy*dy) < (player.width + item.width) / 2) {
            const col = item.components.collectible;
            if (col?.type === 'health') { health = Math.min(100, health + (col.healAmount || 30)); score += col.value || 30; }
            else if (col?.type === 'rune') { if (!collectedRuneIds.includes(item.id)) { collectedRuneIds.push(item.id); score += col.value || 25; setCollectedRunes([...collectedRuneIds]); } }
            else { score += col?.value || 10; }
            entities.delete(item.id);
          }
        });

        Array.from(entities.values()).filter((e: any) => e.type === 'item').forEach((item: any) => {
          const dx = player.transform.x - item.transform.x;
          const dy = player.transform.y - item.transform.y;
          if (Math.sqrt(dx*dx+dy*dy) < (player.width + item.width) / 2) {
            const drop = item.components.itemDrop;
            if (drop) {
              inventory.addItem({ ...drop });
              syncRPGState();
            }
            entities.delete(item.id);
          }
        });
      }

      // Win condition
      const allRunes = projectScene.entities.filter(e => e.type === 'collectible' && e.components?.collectible?.type === 'rune');
      if (allRunes.length > 0 && collectedRuneIds.length >= allRunes.length) setVictory(true);

      // Stats
      frameCount++;
      if (frameCount % 10 === 0) { setPlayerScore(score); setPlayerHealth(health); setPlayerMana(mana); }
      if (frameCount % 30 === 0) {
        const fps = Math.round(1000 / deltaTime);
        const mem = typeof (performance as any).memory === 'object'
          ? `${((performance as any).memory.usedJSHeapSize || 0) / 1048576 | 0}MB` : 'N/A';
        gameStatsRef.current = { fps, entities: entities.size + projectiles.length, memory: mem };
        setGameStats({ fps, entities: entities.size + projectiles.length, memory: mem });
      }
    };

    /* ─── RENDER ─── */
    const render = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
      for (let y = 0; y < canvas.height; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

      // Render layers: obstacles → NPCs → items → collectibles → projectiles → enemies → player → HUD
      const renderLayer = (filterFn: (e: any) => boolean, renderFn: (e: any) => void) => {
        entities.forEach((e: any) => { if (filterFn(e)) renderFn(e); });
      };

      renderLayer((e: any) => e.type === 'obstacle', (entity: any) => {
        const { x, y, scaleX, scaleY } = entity.transform;
        const w = entity.width, h = entity.height;
        ctx.save(); ctx.translate(x, y); ctx.scale(scaleX, scaleY);
        ctx.fillStyle = '#475569'; ctx.fillRect(-w/2, -h/2, w, h);
        ctx.fillStyle = '#64748b'; ctx.fillRect(-w/2, -h/2, w, h * 0.2);
        ctx.fillStyle = '#334155'; ctx.fillRect(w/2 - w*0.1, -h/2, w*0.1, h);
        ctx.restore();
      });

      renderLayer((e: any) => e.type === 'npc', (entity: any) => {
        const { x, y, scaleX, scaleY } = entity.transform;
        const w = entity.width, h = entity.height;
        ctx.save(); ctx.translate(x, y); ctx.scale(scaleX, scaleY);
        ctx.fillStyle = entity.color;
        ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 10); ctx.fill();
        ctx.fillStyle = '#7c3aed';
        ctx.beginPath(); ctx.moveTo(0, -h/2 - 16); ctx.lineTo(-w/2 + 2, -h/2 + 2); ctx.lineTo(w/2 - 2, -h/2 + 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-w/5, -h/8, w/6, 0, Math.PI*2); ctx.arc(w/5, -h/8, w/6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1e3a5f';
        ctx.beginPath(); ctx.arc(-w/5, -h/8, w/12, 0, Math.PI*2); ctx.arc(w/5, -h/8, w/12, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#e9d5ff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(entity.components.npc?.name || 'NPC', 0, h/2 + 12);
        const player = entities.get('player') || entities.get('player-1');
        if (player) {
          const pdx = player.transform.x - entity.transform.x;
          const pdy = player.transform.y - entity.transform.y;
          if (Math.sqrt(pdx*pdx+pdy*pdy) < 80) {
            ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 11px sans-serif';
            ctx.fillText('[TAB] Talk', 0, -h/2 - 22);
          }
        }
        ctx.restore();
      });

      renderLayer((e: any) => e.type === 'item', (entity: any) => {
        const { x, y, rotation } = entity.transform;
        const w = entity.width, h = entity.height;
        ctx.save(); ctx.translate(x, y); ctx.rotate(rotation || 0);
        ctx.fillStyle = entity.color;
        ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-w/4, -h/2+1, w/2, h*0.3);
        ctx.restore();
      });

      renderLayer((e: any) => e.type === 'collectible', (entity: any) => {
        const { x, y, scaleX, scaleY, rotation } = entity.transform;
        const w = entity.width, h = entity.height;
        const col = entity.components.collectible;
        ctx.save(); ctx.translate(x, y); ctx.rotate(rotation || 0); ctx.scale(scaleX, scaleY);
        const grad = ctx.createRadialGradient(0,0,0,0,0,w);
        grad.addColorStop(0, entity.color + '80'); grad.addColorStop(1, entity.color + '00');
        ctx.fillStyle = grad; ctx.fillRect(-w, -h, w*2, h*2);
        ctx.fillStyle = entity.color;
        ctx.beginPath();
        if (col?.type === 'rune') { ctx.moveTo(0,-h/2); ctx.lineTo(w/2,0); ctx.lineTo(0,h/2); ctx.lineTo(-w/2,0); ctx.closePath(); }
        else if (col?.type === 'health') { ctx.arc(0,0,w/2,0,Math.PI*2); }
        else { ctx.fillRect(-w/2,-h/2,w,h); }
        ctx.fill();
        if (col?.type === 'rune') { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(0,0,w/4,0,Math.PI*2); ctx.fill(); }
        ctx.restore();
      });

      // Projectiles
      projectiles.forEach(proj => {
        ctx.save();
        ctx.fillStyle = proj.color || '#fbbf24';
        ctx.shadowColor = proj.color || '#fbbf24';
        ctx.shadowBlur = proj.isSpell ? 15 : 10;
        ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.isSpell ? 7 : 5, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      });

      renderLayer((e: any) => e.type === 'enemy', (entity: any) => {
        const { x, y, scaleX, scaleY } = entity.transform;
        const w = entity.width, h = entity.height;
        ctx.save(); ctx.translate(x, y); ctx.scale(scaleX, scaleY);
        ctx.fillStyle = entity.hitFlash > 0 ? '#fff' : entity.color;
        ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 6); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(-w/5, -h/5, w/6, h/6, 0, 0, Math.PI*2); ctx.ellipse(w/5, -h/5, w/6, h/6, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-w/5, -h/5, w/12, 0, Math.PI*2); ctx.arc(w/5, -h/5, w/12, 0, Math.PI*2); ctx.fill();
        const hpPct = entity.health / entity.maxHealth;
        ctx.fillStyle = '#1f2937'; ctx.fillRect(-w/2-4, -h/2-10, w+8, 4);
        ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(-w/2-4, -h/2-10, (w+8)*hpPct, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${entity.health}/${entity.maxHealth}`, 0, -h/2-14);
        ctx.restore();
      });

      // Player
      const player = entities.get('player') || entities.get('player-1');
      if (player) {
        const { x, y, scaleX, scaleY } = player.transform;
        const w = player.width, h = player.height;
        ctx.save(); ctx.translate(x, y); ctx.scale(scaleX, scaleY);
        if (invincibleTimer > 0 && Math.floor(invincibleTimer / 100) % 2 === 0) ctx.globalAlpha = 0.5;
        ctx.fillStyle = player.color;
        ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 8); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(-w/5, -h/6, w/5, h/5, 0, 0, Math.PI*2); ctx.ellipse(w/5, -h/6, w/5, h/5, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1e3a5f';
        ctx.beginPath(); ctx.arc(-w/5, -h/6, w/10, 0, Math.PI*2); ctx.arc(w/5, -h/6, w/10, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 10;
        ctx.strokeRect(-w/2, -h/2, w, h); ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
        ctx.shadowColor = '#000'; ctx.shadowBlur = 2; ctx.fillText('YOU', 0, h/2+12); ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ─── Canvas HUD ───
      const stats = gameStatsRef.current;
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.beginPath(); ctx.roundRect(10, 10, 200, 150, 8); ctx.fill();
      ctx.fillStyle = 'white'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, 20, 35);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(20, 45, 100, 10);
      ctx.fillStyle = health > 50 ? '#22c55e' : health > 25 ? '#eab308' : '#ef4444';
      ctx.fillRect(20, 45, 100 * (health/100), 10);
      ctx.fillStyle = 'white'; ctx.font = '9px monospace'; ctx.fillText(`HP ${Math.round(health)}`, 125, 54);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(20, 58, 100, 10);
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(20, 58, 100 * (mana/100), 10);
      ctx.fillStyle = 'white'; ctx.fillText(`MP ${Math.round(mana)}`, 125, 67);
      ctx.font = '12px monospace';
      ctx.fillText(`FPS: ${stats.fps}`, 20, 85);
      ctx.fillText(`Runes: ${collectedRuneIds.length}`, 20, 100);
      ctx.fillText(`Time: ${Math.floor(gameTime/1000)}s`, 20, 115);
      ctx.fillText(`Entities: ${stats.entities}`, 20, 130);
      const wpn = inventory.equipment.weapon;
      if (wpn) { ctx.fillStyle = '#fbbf24'; ctx.fillText(`⚔ ${wpn.name}`, 20, 145); }

      if (questHUDText) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath(); ctx.roundRect(10, 168, 280, 24, 6); ctx.fill();
        ctx.fillStyle = '#fbbf24'; ctx.font = '11px monospace';
        ctx.fillText(`📜 ${questHUDText}`, 18, 184);
      }

      const activeSpells = spellMgr.learnedSpells.filter((s: any) => s.hotkey !== null);
      if (activeSpells.length > 0) {
        const barX = canvas.width / 2 - (activeSpells.length * 44) / 2;
        const barY = canvas.height - 56;
        activeSpells.forEach((spell: any, i: number) => {
          const sx = barX + i * 44;
          ctx.fillStyle = spell.currentCooldown > 0 ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.8)';
          ctx.beginPath(); ctx.roundRect(sx, barY, 40, 40, 6); ctx.fill();
          ctx.strokeStyle = spell.currentCooldown > 0 ? '#475569' : '#60a5fa';
          ctx.lineWidth = 2; ctx.strokeRect(sx, barY, 40, 40);
          ctx.font = '18px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(spell.icon, sx + 20, barY + 28);
          ctx.fillStyle = '#fff'; ctx.font = '9px monospace';
          ctx.fillText(`${spell.hotkey}`, sx + 20, barY + 38);
          if (spell.currentCooldown > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(sx, barY, 40, 40 * Math.min(1, spell.currentCooldown / spell.cooldown));
          }
        });
      }

      // Minimap
      const mmSize = 120, mmX = canvas.width - mmSize - 10, mmY = 10;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.roundRect(mmX, mmY, mmSize, mmSize, 6); ctx.fill();
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.strokeRect(mmX, mmY, mmSize, mmSize);
      const scaleX = mmSize / canvas.width, scaleY = mmSize / canvas.height;
      entities.forEach((entity: any) => {
        ctx.fillStyle = TYPE_COLORS[entity.type] || '#8b5cf6';
        const ex = mmX + entity.transform.x * scaleX;
        const ey = mmY + entity.transform.y * scaleY;
        ctx.fillRect(ex - 2, ey - 2, 4, 4);
      });
    };

    /* ─── GAME LOOP ─── */
    const gameLoop = () => {
      update();
      render();
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [projectScene, gameStarted, gamePaused, gameOver, victory, syncRPGState, questHUDText, handleSave]);

  /* ─── RENDER ─── */

  if (loading) {
    return (
      <div className="game-preview">
        <div className="game-preview-loading">
          <div className="game-preview-spinner" />
          <p>Loading game engine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-preview">
        <div className="game-preview-error">
          <div className="game-preview-error-icon">⚠️</div>
          <h3>Error Loading Game</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-preview">
      <div className="game-preview-container">
        {/* Header */}
        <div className="game-preview-header">
          <button className="back-to-editor-btn" onClick={handleBackToEditor}>
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="game-preview-title">{projectName}</h1>
          <div className="game-preview-controls">
            <span className={`game-status ${gameStarted ? (gamePaused ? 'paused' : 'playing') : 'ready'}`}>
              {gameStarted ? (gamePaused ? '⏸ Paused' : '▶ Playing') : '⏹ Ready'}
            </span>
          </div>
        </div>

        {/* Canvas */}
        <div className="game-preview-canvas-wrapper">
          <canvas ref={canvasRef} className="game-preview-canvas" />

          {/* Notifications */}
          {notifications.length > 0 && (
            <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 40 }}>
              {notifications.map(n => (
                <div key={n.id} style={{
                  padding: '8px 14px', marginBottom: 4, borderRadius: 8,
                  background: n.type === 'loot' ? 'rgba(34,197,94,0.9)' : n.type === 'quest' ? 'rgba(59,130,246,0.9)' : 'rgba(100,116,139,0.9)',
                  color: '#fff', fontSize: 13, fontWeight: 500, minWidth: 180,
                }}>{n.icon} {n.message}</div>
              ))}
            </div>
          )}

          {/* RPG Panels */}
          <RPGPanels
            activePanel={activePanel}
            onClosePanel={() => setActivePanel('none')}
            inventoryItems={inventoryItems}
            onUseItem={handleUseItem}
            onEquipItem={handleEquipItem}
            questList={questList}
            craftingGrid={craftingGrid}
            craftResult={craftResult}
            onCraftingCell={handleCraftingCell}
            onLearnSpell={handleLearnSpell}
            learnedSpells={learnedSpells}
            onAssignHotkey={handleAssignHotkey}
            saveSlots={saveSlots}
            gamePaused={gamePaused}
            onSave={handleSave}
            onLoad={handleLoad}
            onDeleteSave={handleDeleteSave}
            onResume={handlePauseResume}
            dialogueSpeaker={dialogueSpeaker}
            dialoguePortrait={dialoguePortrait}
            dialogueText={dialogueText}
            dialogueChoices={dialogueChoices}
            onDialogueChoice={handleDialogueChoice}
          />

          {/* ── Overlay screens ── */}
          {!gameStarted && (
            <div className="game-preview-start-screen">
              <div className="start-screen-content">
                <div className="start-screen-icon">🎮</div>
                <h2>{projectName}</h2>
                <p>Use WASD to move, SPACE to shoot. Defeat enemies and collect items!</p>
                <div className="start-screen-info">
                  <div className="info-item"><span className="info-icon">🎯</span><span>WASD/Arrows to move</span></div>
                  <div className="info-item"><span className="info-icon">🔥</span><span>SPACE to shoot</span></div>
                  <div className="info-item"><span className="info-icon">💎</span><span>Collect runes to win</span></div>
                  <div className="info-item"><span className="info-icon">🧙</span><span>TAB to talk to NPCs</span></div>
                  <div className="info-item"><span className="info-icon">🎒</span><span>I: Inventory, J: Quests, C: Craft</span></div>
                  <div className="info-item"><span className="info-icon">💾</span><span>F5: Quick Save, ESC: Menu</span></div>
                </div>
                <button className="start-game-btn" onClick={handleStartGame}><Play size={20} /> Start Game</button>
              </div>
            </div>
          )}

          {gameOver && (
            <div className="game-preview-gameover-overlay">
              <div className="gameover-screen-content">
                <div className="gameover-screen-icon"><Skull size={64} /></div>
                <h2>Game Over</h2>
                <p className="gameover-score">Score: {playerScore}</p>
                <p className="gameover-stats">Runes: {collectedRunes.length}</p>
                <p className="gameover-time">Time: {timeElapsed}s</p>
                <div className="gameover-buttons">
                  <button className="restart-btn" onClick={handleRestart}><Play size={20} /> Try Again</button>
                  <button className="back-btn" onClick={handleBackToEditor}><ArrowLeft size={20} /> Editor</button>
                </div>
              </div>
            </div>
          )}

          {victory && (
            <div className="game-preview-victory-overlay">
              <div className="victory-screen-content">
                <div className="victory-screen-icon"><Trophy size={64} /></div>
                <h2>Victory!</h2>
                <p className="victory-score">Score: {playerScore}</p>
                <p className="victory-time">Time: {timeElapsed}s</p>
                <p className="victory-health">Health: {Math.round(playerHealth)}%</p>
                <div className="victory-buttons">
                  <button className="restart-btn" onClick={handleRestart}><Play size={20} /> Play Again</button>
                  <button className="back-btn" onClick={handleBackToEditor}><ArrowLeft size={20} /> Editor</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Page wrapper ─── */
export function GamePreviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) {
    return (
      <div className="game-preview">
        <div className="game-preview-error">
          <div className="game-preview-error-icon">🎮</div>
          <h3>No Project Selected</h3>
          <p>Please open a project first to preview.</p>
        </div>
      </div>
    );
  }
  return (
    <Suspense fallback={
      <div className="game-preview">
        <div className="game-preview-loading">
          <div className="game-preview-spinner" />
          <p>Loading game engine...</p>
        </div>
      </div>
    }>
      <GamePreviewContent />
    </Suspense>
  );
}
