/**
 * @clawgame/web - Game Preview Page — Eclipse of Runes
 * Full RPG integration: Inventory, Quests, Dialogue, Spell Crafting, Save/Load, Notifications
 */
import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Play, X, Zap, Code, ArrowLeft, Skull, Trophy, Heart, Save, Trash2, Upload } from 'lucide-react';
import '../game-preview.css';
import { logger } from '../utils/logger';
import { InventoryManager } from '../rpg/inventory';
import { QuestManager } from '../rpg/quests';
import { DialogueManager } from '../rpg/dialogue';
import { SpellCraftingManager } from '../rpg/spellcrafting';
import { SaveLoadManager } from '../rpg/saveload';
import { subscribeNotifications } from '../rpg/notifications';
import { SPELL_RECIPES } from '../rpg/data/recipes';
import type {
  Item, GameNotification, Quest, DialogueTree, ElementType, LearnedSpell,
} from '../rpg/types';

/* ─── Scene type ─── */
interface ProjectScene {
  name: string;
  description?: string;
  entities: Array<{
    id: string;
    type?: string;
    transform?: { x: number; y: number; scaleX: number; scaleY: number; rotation: number };
    components: Record<string, any>;
  }>;
  dialogueTrees?: DialogueTree[];
  quests?: Quest[];
  metadata?: { features?: string[] };
}

interface GameStats { fps: number; entities: number; memory: string; }

/* ─── Panel state ─── */
type UIPanel = 'none' | 'inventory' | 'quests' | 'spellcraft' | 'saveload' | 'dialogue';

/* ═══════════════════════════════════════════════════════════
   GAME PREVIEW CONTENT
   ═══════════════════════════════════════════════════════════ */
const GamePreviewContent: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const gameStatsRef = useRef<GameStats>({ fps: 60, entities: 0, memory: '0MB' });
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  /* ─── State ─── */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectScene, setProjectScene] = useState<ProjectScene | null>(null);
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

  /* RPG state */
  const [activePanel, setActivePanel] = useState<UIPanel>('none');
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const [inventoryItems, setInventoryItems] = useState<Item[]>([]);
  const [questList, setQuestList] = useState<Quest[]>([]);
  const [dialogueText, setDialogueText] = useState('');
  const [dialogueSpeaker, setDialogueSpeaker] = useState('');
  const [dialoguePortrait, setDialoguePortrait] = useState('');
  const [dialogueChoices, setDialogueChoices] = useState<{ text: string; index: number }[]>([]);
  const [craftingGrid, setCraftingGrid] = useState<(ElementType | null)[][]>([[null,null,null],[null,null,null],[null,null,null]]);
  const [craftResult, setCraftResult] = useState<string | null>(null);
  const [learnedSpells, setLearnedSpells] = useState<LearnedSpell[]>([]);
  const [saveSlots, setSaveSlots] = useState<{ id: number; name: string; timestamp: number; playTime: number }[]>([]);
  const [questHUDText, setQuestHUDText] = useState('');

  /* RPG managers (refs to survive re-renders) */
  const inventoryRef = useRef(new InventoryManager());
  const questMgrRef = useRef(new QuestManager());
  const dialogueMgrRef = useRef(new DialogueManager());
  const spellMgrRef = useRef(new SpellCraftingManager());
  const saveMgrRef = useRef(new SaveLoadManager());

  /* Game loop mutable state */
  const gameLoopState = useRef<any>(null);

  /* Notification subscription */
  useEffect(() => {
    const unsub = subscribeNotifications((n: GameNotification) => {
      setNotifications(prev => [...prev, n]);
      setTimeout(() => setNotifications(prev => prev.filter(x => x.id !== n.id)), n.duration);
    });
    return unsub;
  }, []);

  /* Sync RPG state to React for UI panels */
  const syncRPGState = useCallback(() => {
    setInventoryItems(inventoryRef.current.items.map(i => ({ ...i })));
    setQuestList(questMgrRef.current.quests.map(q => ({ ...q, objectives: q.objectives.map(o => ({ ...o })) })));
    setLearnedSpells(spellMgrRef.current.learnedSpells.map(s => ({ ...s })));
    // quest HUD
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
    setSaveSlots(saveMgrRef.current.listSaves().map(s => ({ id: s.id, name: s.name, timestamp: s.timestamp, playTime: s.playTime })));
  }, []);

  /* ─── Load scene ─── */
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await api.getProject(projectId);
        try {
          const sceneData = await api.readFile(projectId, 'scenes/main-scene.json');
          const parsed = JSON.parse(sceneData.content);
          const validatedEntities = (parsed.entities || []).map((e: any) => ({
            id: e.id || `e-${Math.random().toString(36).substr(2, 9)}`,
            type: e.type || 'unknown',
            transform: e.transform || { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
            components: e.components || {},
          }));
          setProjectScene({
            name: parsed.name || 'Main Scene',
            description: parsed.description,
            entities: validatedEntities,
            dialogueTrees: parsed.dialogueTrees || [],
            quests: parsed.quests || [],
            metadata: parsed.metadata,
          });
        } catch {
          setProjectScene({ name: 'Main Scene', entities: [] });
        }
      } catch (err) {
        logger.error('Failed to load project:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

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
      entities.set(entity.id, {
        id: entity.id,
        type: entity.type || 'unknown',
        transform: { ...t },
        components: entity.components || {},
        vx: 0, vy: 0,
        color: entity.components.sprite?.color || '#8b5cf6',
        width: entity.components.sprite?.width || 32,
        height: entity.components.sprite?.height || 32,
        health: entity.components.stats?.hp || 30,
        maxHealth: entity.components.stats?.maxHp || 30,
        damage: entity.components.stats?.damage || 10,
        enemyType: entity.components.enemyType || entity.components.ai?.type || 'slime',
        patrolOrigin: { x: t.x, y: t.y },
        patrolOffset: Math.random() * Math.PI * 2,
        hitFlash: 0,
        facing: 'right',
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

    // Register dialogue trees from scene
    if (projectScene.dialogueTrees) {
      projectScene.dialogueTrees.forEach(dt => dialogueMgr.registerTree(dt));
    }

    // Give starting items to player
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
      inventory, questMgr, dialogueMgr, spellMgr,
      canvas,
    };

    /* ─── Input ─── */
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = true;

      // Don't handle game keys if a UI panel is open
      const panelOpen = ['inventory', 'quests', 'spellcraft', 'saveload'].includes(
        document.querySelector('[data-rpg-panel]')?.getAttribute('data-rpg-panel') || 'none'
      );

      if (e.key === 'Escape') {
        // Close panel first, then pause
        setActivePanel(prev => {
          if (prev !== 'none' && prev !== 'dialogue') return 'none';
          if (prev === 'none' && gameStarted && !gameOver && !victory) {
            setGamePaused(true);
            return 'saveload'; // show save/load in pause menu
          }
          if ((prev as string) === 'saveload' && gamePaused) {
            return 'none'; // close, stay paused
          }
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

            const baseDamage = inventory.getWeaponDamage();
            projectiles.push({
              id: `proj-${Date.now()}-${Math.random()}`,
              x: player.transform.x, y: player.transform.y,
              vx: dx * 500, vy: dy * 500,
              damage: baseDamage,
              color: '#fbbf24',
              createdAt: currentTime,
            });
            lastShotTime = currentTime;
          }
        }
        return;
      }

      // RPG hotkeys (only when game running, not paused by panel)
      if (!gameStarted || gameOver || victory) return;

      if (k === 'i') { e.preventDefault(); setActivePanel(p => p === 'inventory' ? 'none' : 'inventory'); syncRPGState(); return; }
      if (k === 'j') { e.preventDefault(); setActivePanel(p => p === 'quests' ? 'none' : 'quests'); syncRPGState(); return; }
      if (k === 'c') { e.preventDefault(); setActivePanel(p => p === 'spellcraft' ? 'none' : 'spellcraft'); syncRPGState(); return; }
      if (k === 'f5') { e.preventDefault(); quickSave(); return; }
      if (k === 'tab') {
        e.preventDefault();
        // Try to open dialogue with nearby NPC
        const player = entities.get('player') || entities.get('player-1');
        if (player) {
          const npcs = Array.from(entities.values()).filter(e => e.type === 'npc');
          for (const npc of npcs) {
            const dx = player.transform.x - npc.transform.x;
            const dy = player.transform.y - npc.transform.y;
            if (Math.sqrt(dx*dx+dy*dy) < 80) {
              const treeId = npc.components.npc?.dialogueTreeId;
              if (treeId && dialogueMgr.startDialogue(treeId)) {
                setActivePanel('dialogue');
                advanceDialogueView();
                return;
              }
            }
          }
        }
        return;
      }

      // Spell hotkeys 1-8
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
              health = Math.min(100, health - spell.damage); // negative damage = heal
            } else if (spell.effectType === 'projectile') {
              projectiles.push({
                id: `spell-${Date.now()}-${Math.random()}`,
                x: player.transform.x, y: player.transform.y,
                vx: dx * spell.projectileSpeed, vy: dy * spell.projectileSpeed,
                damage: spell.damage,
                color: spell.projectileColor,
                createdAt: performance.now(),
                isSpell: true,
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

    /* ─── Helpers ─── */
    const checkCollision = (a: any, b: any) => {
      const dx = a.transform.x - b.transform.x;
      const dy = a.transform.y - b.transform.y;
      return Math.sqrt(dx*dx+dy*dy) < (a.width + b.width) / 2;
    };

    const advanceDialogueView = () => {
      const line = dialogueMgr.getCurrentLine();
      if (!line) { setActivePanel('none'); return; }
      setDialogueSpeaker(line.speaker);
      setDialoguePortrait(line.portrait || '💬');
      setDialogueText(line.text);
      const choices = dialogueMgr.getChoices();
      setDialogueChoices(choices.map((c, i) => ({ text: c.text, index: i })));
    };

    const quickSave = () => {
      const player = entities.get('player') || entities.get('player-1');
      if (!player) return;
      const data = saveMgrRef.current.serializeGameState({
        playerPosition: { x: player.transform.x, y: player.transform.y },
        playerHealth: health,
        playerScore: score,
        inventory,
        questManager: questMgr,
        spellManager: spellMgr,
        dialogueManager: dialogueMgr,
        collectedRunes: collectedRuneIds,
        defeatedEnemies,
        gameTime,
        entities,
      });
      saveMgrRef.current.save(0, data, 'Quick Save');
      refreshSaveSlots();
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

      // Mana regen
      mana = Math.min(100, mana + deltaTime * 0.01);

      // Spell cooldowns
      spellMgr.tickCooldowns(deltaTime);

      // Update projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        proj.x += proj.vx * (deltaTime / 1000);
        proj.y += proj.vy * (deltaTime / 1000);
        if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
          projectiles.splice(i, 1); continue;
        }
        // Hit enemies
        const enemies = Array.from(entities.values()).filter(e => e.type === 'enemy');
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
              // Quest tracking
              questMgr.onKill(enemy.enemyType || 'slime');
              syncRPGState();
              entities.delete(enemy.id);
            }
            break;
          }
        }
        // Hit obstacles
        if (!projectiles[i]) continue;
        const obstacles = Array.from(entities.values()).filter(e => e.type === 'obstacle');
        for (const obs of obstacles) {
          const dx = proj.x - obs.transform.x;
          const dy = proj.y - obs.transform.y;
          if (Math.sqrt(dx*dx+dy*dy) < (obs.width + 10) / 2) {
            projectiles.splice(i, 1); break;
          }
        }
      }

      // Update entities
      entities.forEach((entity, id) => {
        // Player movement
        if (entity.components?.playerInput) {
          const speed = entity.components.movement?.speed || 200;
          let newVx = 0, newVy = 0;
          if (keys['arrowleft'] || keys['a']) newVx = -speed;
          if (keys['arrowright'] || keys['d']) newVx = speed;
          if (keys['arrowup'] || keys['w']) newVy = -speed;
          if (keys['arrowdown'] || keys['s']) newVy = speed;
          const obstacles = Array.from(entities.values()).filter(e => e.type === 'obstacle');
          const nextX = entity.transform.x + newVx * (deltaTime / 1000);
          const testX = { ...entity, transform: { ...entity.transform, x: nextX } };
          if (!obstacles.some(o => id !== o.id && checkCollision(testX, o))) entity.transform.x = nextX;
          const nextY = entity.transform.y + newVy * (deltaTime / 1000);
          const testY = { ...entity, transform: { ...entity.transform, y: nextY } };
          if (!obstacles.some(o => id !== o.id && checkCollision(testY, o))) entity.transform.y = nextY;
          const margin = entity.width / 2;
          entity.transform.x = Math.max(margin, Math.min(canvas.width - margin, entity.transform.x));
          entity.transform.y = Math.max(margin, Math.min(canvas.height - margin, entity.transform.y));
          if (newVx > 0) entity.facing = 'right';
          if (newVx < 0) entity.facing = 'left';
        }

        // Enemy AI
        if (entity.type === 'enemy' && gameStarted) {
          const player = entities.get('player') || entities.get('player-1');
          const patrolSpeed = entity.components.ai?.speed || 50;
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
          // hit flash decay
          if (entity.hitFlash > 0) entity.hitFlash -= deltaTime;
        }

        // Collectible animation
        if (entity.type === 'collectible' || entity.type === 'item') {
          entity.transform.rotation = (entity.transform.rotation || 0) + deltaTime * 0.003;
        }
      });

      // Collectible pickup
      const player = entities.get('player') || entities.get('player-1');
      if (player) {
        // Scene collectibles (runes, health, gold)
        Array.from(entities.values()).filter(e => e.type === 'collectible').forEach(item => {
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

        // Item drops
        Array.from(entities.values()).filter(e => e.type === 'item').forEach(item => {
          const dx = player.transform.x - item.transform.x;
          const dy = player.transform.y - item.transform.y;
          if (Math.sqrt(dx*dx+dy*dy) < (player.width + item.width) / 2) {
            const drop = item.components.itemDrop;
            if (drop) {
              inventory.addItem({
                id: drop.itemId, name: drop.name, description: drop.description,
                type: drop.type, rarity: drop.rarity, icon: drop.icon,
                stackable: drop.stackable, quantity: drop.quantity, maxStack: drop.maxStack,
                stats: drop.stats, usable: drop.usable, equippable: drop.equippable,
                slot: drop.slot, sellValue: drop.sellValue,
              });
              syncRPGState();
            }
            entities.delete(item.id);
          }
        });
      }

      // Win condition
      const allRunes = projectScene.entities.filter(e => e.type === 'collectible' && e.components.collectible?.type === 'rune');
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

      // Obstacles
      entities.forEach(entity => {
        if (entity.type === 'obstacle') {
          const { x, y, scaleX, scaleY } = entity.transform;
          const w = entity.width, h = entity.height;
          ctx.save(); ctx.translate(x, y); ctx.scale(scaleX, scaleY);
          ctx.fillStyle = '#475569'; ctx.fillRect(-w/2, -h/2, w, h);
          ctx.fillStyle = '#64748b'; ctx.fillRect(-w/2, -h/2, w, h * 0.2);
          ctx.fillStyle = '#334155'; ctx.fillRect(w/2 - w*0.1, -h/2, w*0.1, h);
          ctx.restore();
        }
      });

      // NPCs
      entities.forEach(entity => {
        if (entity.type === 'npc') {
          const { x, y, scaleX, scaleY } = entity.transform;
          const w = entity.width, h = entity.height;
          ctx.save(); ctx.translate(x, y); ctx.scale(scaleX, scaleY);
          // Body
          ctx.fillStyle = entity.color;
          ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 10); ctx.fill();
          // Hat (wizard)
          ctx.fillStyle = '#7c3aed';
          ctx.beginPath(); ctx.moveTo(0, -h/2 - 16); ctx.lineTo(-w/2 + 2, -h/2 + 2); ctx.lineTo(w/2 - 2, -h/2 + 2); ctx.closePath(); ctx.fill();
          // Eyes
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(-w/5, -h/8, w/6, 0, Math.PI*2); ctx.arc(w/5, -h/8, w/6, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#1e3a5f';
          ctx.beginPath(); ctx.arc(-w/5, -h/8, w/12, 0, Math.PI*2); ctx.arc(w/5, -h/8, w/12, 0, Math.PI*2); ctx.fill();
          // Label
          ctx.fillStyle = '#e9d5ff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(entity.components.npc?.name || 'NPC', 0, h/2 + 12);
          // Interaction hint
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
        }
      });

      // Item drops
      entities.forEach(entity => {
        if (entity.type === 'item') {
          const { x, y, rotation } = entity.transform;
          const w = entity.width, h = entity.height;
          ctx.save(); ctx.translate(x, y); ctx.rotate(rotation || 0);
          ctx.fillStyle = entity.color;
          ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 4); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-w/4, -h/2+1, w/2, h*0.3);
          ctx.restore();
        }
      });

      // Collectibles
      entities.forEach(entity => {
        if (entity.type === 'collectible') {
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
        }
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

      // Enemies
      entities.forEach(entity => {
        if (entity.type === 'enemy') {
          const { x, y, scaleX, scaleY } = entity.transform;
          const w = entity.width, h = entity.height;
          ctx.save(); ctx.translate(x, y); ctx.scale(scaleX, scaleY);
          // Hit flash
          ctx.fillStyle = entity.hitFlash > 0 ? '#fff' : entity.color;
          ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 6); ctx.fill();
          // Eyes
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.ellipse(-w/5, -h/5, w/6, h/6, 0, 0, Math.PI*2); ctx.ellipse(w/5, -h/5, w/6, h/6, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath(); ctx.arc(-w/5, -h/5, w/12, 0, Math.PI*2); ctx.arc(w/5, -h/5, w/12, 0, Math.PI*2); ctx.fill();
          // HP bar
          const hpPct = entity.health / entity.maxHealth;
          ctx.fillStyle = '#1f2937'; ctx.fillRect(-w/2-4, -h/2-10, w+8, 4);
          ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
          ctx.fillRect(-w/2-4, -h/2-10, (w+8)*hpPct, 4);
          ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(`${entity.health}/${entity.maxHealth}`, 0, -h/2-14);
          ctx.restore();
        }
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

      // Stats panel
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.beginPath(); ctx.roundRect(10, 10, 200, 150, 8); ctx.fill();
      ctx.fillStyle = 'white'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, 20, 35);
      // HP bar
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(20, 45, 100, 10);
      ctx.fillStyle = health > 50 ? '#22c55e' : health > 25 ? '#eab308' : '#ef4444';
      ctx.fillRect(20, 45, 100 * (health/100), 10);
      ctx.fillStyle = 'white'; ctx.font = '9px monospace'; ctx.fillText(`HP ${Math.round(health)}`, 125, 54);
      // MP bar
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(20, 58, 100, 10);
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(20, 58, 100 * (mana/100), 10);
      ctx.fillStyle = 'white'; ctx.fillText(`MP ${Math.round(mana)}`, 125, 67);
      ctx.font = '12px monospace';
      ctx.fillText(`FPS: ${stats.fps}`, 20, 85);
      ctx.fillText(`Runes: ${collectedRuneIds.length}`, 20, 100);
      ctx.fillText(`Time: ${Math.floor(gameTime/1000)}s`, 20, 115);
      ctx.fillText(`Entities: ${stats.entities}`, 20, 130);
      // Weapon
      const wpn = inventory.equipment.weapon;
      if (wpn) { ctx.fillStyle = '#fbbf24'; ctx.fillText(`⚔ ${wpn.name}`, 20, 145); }

      // Quest HUD (below stats)
      if (questHUDText) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath(); ctx.roundRect(10, 168, 280, 24, 6); ctx.fill();
        ctx.fillStyle = '#fbbf24'; ctx.font = '11px monospace';
        ctx.fillText(`📜 ${questHUDText}`, 18, 184);
      }

      // Spell bar (bottom center)
      const activeSpells = spellMgr.learnedSpells.filter(s => s.hotkey !== null);
      if (activeSpells.length > 0) {
        const barX = canvas.width / 2 - (activeSpells.length * 44) / 2;
        const barY = canvas.height - 56;
        activeSpells.forEach((spell, i) => {
          const sx = barX + i * 44;
          ctx.fillStyle = spell.currentCooldown > 0 ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.8)';
          ctx.beginPath(); ctx.roundRect(sx, barY, 40, 40, 6); ctx.fill();
          ctx.strokeStyle = spell.currentCooldown > 0 ? '#475569' : '#60a5fa';
          ctx.lineWidth = 2; ctx.strokeRect(sx, barY, 40, 40);
          ctx.font = '18px sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = spell.currentCooldown > 0 ? '#475569' : '#fff';
          ctx.fillText(spell.icon, sx+20, barY+26);
          ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#94a3b8';
          ctx.fillText(`${spell.hotkey}`, sx+20, barY+38);
          if (spell.currentCooldown > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            const cdPct = spell.currentCooldown / spell.cooldown;
            ctx.fillRect(sx+1, barY + 40 * (1-cdPct), 38, 40 * cdPct);
          }
        });
      }

      // Controls panel
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.beginPath(); ctx.roundRect(canvas.width-220, 10, 210, 140, 8); ctx.fill();
      ctx.fillStyle = 'white'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
      ctx.fillText('Controls:', canvas.width-210, 32);
      ctx.font = '10px monospace';
      const controls = [
        'WASD/Arrows: Move', 'SPACE: Shoot', 'TAB: Talk to NPC',
        'I: Inventory', 'J: Quests', 'C: Spell Craft',
        'F5: Quick Save', 'ESC: Pause/Menu', '1-8: Cast Spell',
      ];
      controls.forEach((c, i) => ctx.fillText(c, canvas.width-210, 48 + i * 14));
      ctx.font = '10px monospace';
      const statusText = gameStarted && !gamePaused ? 'RUNNING' : gamePaused ? 'PAUSED' : 'READY';
      ctx.fillStyle = gameStarted && !gamePaused ? '#22c55e' : gamePaused ? '#eab308' : '#6b7280';
      ctx.fillText(statusText, canvas.width-210, 48 + controls.length * 14 + 4);

      // Scene name
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.beginPath(); ctx.roundRect(10, canvas.height-35, 300, 28, 8); ctx.fill();
      ctx.fillStyle = 'white'; ctx.font = '12px monospace'; ctx.textAlign = 'left';
      ctx.fillText(projectScene?.name || 'Game Preview', 20, canvas.height-17);
    };

    const gameLoop = () => { update(); render(); animationRef.current = requestAnimationFrame(gameLoop); };
    gameLoop();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', resizeCanvas);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectScene, gameStarted, gamePaused, gameOver, victory]);

  /* ─── Handlers ─── */
  const handleStartGame = () => {
    setGameStarted(true); setGamePaused(false); setGameOver(false); setVictory(false);
    setPlayerScore(0); setPlayerHealth(100); setPlayerMana(100);
    setCollectedRunes([]); setTimeElapsed(0);
    setActivePanel('none');
  };

  const handleBackToEditor = () => navigate(`/project/${projectId}`);
  const handlePauseResume = () => {
    if (gamePaused) { setGamePaused(false); setActivePanel('none'); }
    else { setGamePaused(true); setActivePanel('saveload'); refreshSaveSlots(); }
  };
  const handleRestart = () => {
    setGameOver(false); setVictory(false); setPlayerScore(0); setPlayerHealth(100); setPlayerMana(100);
    setCollectedRunes([]); setTimeElapsed(0); setGamePaused(false); setActivePanel('none');
    // Reset RPG managers
    inventoryRef.current = new InventoryManager();
    questMgrRef.current = new QuestManager();
    dialogueMgrRef.current = new DialogueManager();
    spellMgrRef.current = new SpellCraftingManager();
    gameLoopState.current = null;
  };

  /* ─── RPG Panel Handlers ─── */
  const handleUseItem = (itemId: string) => {
    const result = inventoryRef.current.useItem(itemId);
    if (result?.healed && gameLoopState.current) {
      gameLoopState.current.setHealth(Math.min(100, gameLoopState.current.getHealth() + result.healed));
    }
    syncRPGState();
  };

  const handleEquipItem = (itemId: string) => {
    inventoryRef.current.equipItem(itemId);
    syncRPGState();
  };

  const handleDialogueChoice = (index: number) => {
    const { ended, effect } = dialogueMgrRef.current.advance(index);
    if (effect?.type === 'startQuest' && effect.payload.questId) {
      const questData = projectScene?.quests?.find(q => q.id === effect.payload.questId);
      if (questData) questMgrRef.current.addQuest({ ...questData });
      syncRPGState();
    }
    if (effect?.type === 'heal' && gameLoopState.current) {
      gameLoopState.current.setHealth(Math.min(100, gameLoopState.current.getHealth() + (effect.payload.amount || 0)));
    }
    if (ended) { setActivePanel('none'); }
    else {
      const line = dialogueMgrRef.current.getCurrentLine();
      if (line) {
        setDialogueSpeaker(line.speaker); setDialoguePortrait(line.portrait || '💬');
        setDialogueText(line.text);
        setDialogueChoices(dialogueMgrRef.current.getChoices().map((c, i) => ({ text: c.text, index: i })));
      } else { setActivePanel('none'); }
    }
  };

  const handleCraftingCell = (r: number, c: number) => {
    const elements: ElementType[] = ['fire', 'water', 'earth', 'air', 'shadow', 'light'];
    const current = craftingGrid[r][c];
    const nextIdx = current ? (elements.indexOf(current) + 1) % elements.length : 0;
    const newGrid = craftingGrid.map(row => [...row]);
    newGrid[r][c] = elements[nextIdx];
    setCraftingGrid(newGrid);
    spellMgrRef.current.grid = newGrid;
    const match = spellMgrRef.current.findMatch();
    setCraftResult(match ? `${match.icon} ${match.name} — ${match.description}` : null);
  };

  const handleLearnSpell = () => {
    const match = spellMgrRef.current.findMatch();
    if (match) {
      const spell = spellMgrRef.current.learnSpell(match);
      if (spell) {
        // Auto-assign to first free hotkey
        for (let h = 1; h <= 8; h++) {
          if (!spellMgrRef.current.getSpellByHotkey(h)) {
            spellMgrRef.current.assignHotkey(spell.id, h);
            break;
          }
        }
      }
      syncRPGState();
      spellMgrRef.current.clearGrid();
      setCraftingGrid([[null,null,null],[null,null,null],[null,null,null]]);
      setCraftResult(null);
    }
  };

  const handleAssignHotkey = (spellId: string, hotkey: number) => {
    spellMgrRef.current.assignHotkey(spellId, hotkey);
    syncRPGState();
  };

  const handleSave = (slotId: number) => {
    const gls = gameLoopState.current;
    if (!gls) return;
    const player = gls.getPlayer();
    if (!player) return;
    const data = saveMgrRef.current.serializeGameState({
      playerPosition: { x: player.transform.x, y: player.transform.y },
      playerHealth: gls.getHealth(), playerScore: gls.getScore(),
      inventory: inventoryRef.current, questManager: questMgrRef.current,
      spellManager: spellMgrRef.current, dialogueManager: dialogueMgrRef.current,
      collectedRunes: gls.getCollectedRunes(), defeatedEnemies: gls.getDefeatedEnemies(),
      gameTime: gls.getGameTime(), entities: gls.entities,
    });
    saveMgrRef.current.save(slotId, data, slotId === 0 ? 'Quick Save' : `Slot ${slotId}`);
    refreshSaveSlots();
  };

  const handleLoad = (slotId: number) => {
    const data = saveMgrRef.current.load(slotId);
    if (!data) return;
    // Restore RPG state
    inventoryRef.current.load({ items: data.inventory, equipment: data.equipment });
    questMgrRef.current.load(data.quests);
    spellMgrRef.current.load(data.learnedSpells);
    dialogueMgrRef.current.load(data.dialogueFlags);
    // Restore game state
    if (gameLoopState.current) {
      const gls = gameLoopState.current;
      gls.setHealth(data.playerHealth);
      gls.setScore(data.playerScore);
      const player = gls.getPlayer();
      if (player) { player.transform.x = data.playerPosition.x; player.transform.y = data.playerPosition.y; }
      // Restore entities
      data.entities.forEach(se => {
        const e = gls.entities.get(se.id);
        if (e) {
          if (se.health !== undefined) e.health = se.health;
          e.transform.x = se.x; e.transform.y = se.y;
        } else if (!se.active) {
          gls.entities.delete(se.id);
        }
      });
      // Remove entities that were defeated
      data.defeatedEnemies.forEach(eid => gls.entities.delete(eid));
    }
    setPlayerHealth(data.playerHealth);
    setPlayerScore(data.playerScore);
    setCollectedRunes(data.collectedRunes);
    setTimeElapsed(Math.floor(data.gameTime / 1000));
    setGamePaused(false);
    setActivePanel('none');
    syncRPGState();
  };

  const handleDeleteSave = (slotId: number) => {
    saveMgrRef.current.deleteSave(slotId);
    refreshSaveSlots();
  };

  /* ─── Render ─── */
  if (loading) {
    return (
      <div className="game-preview">
        <div className="game-preview-loading">
          <div className="game-preview-spinner" />
          <p>Loading game...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="game-preview">
        <div className="game-preview-error">
          <div className="game-preview-error-icon">⚠️</div>
          <h3>Failed to Load Game</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-preview">
      {/* Header */}
      <div className="game-preview-header">
        <button className="header-btn" onClick={handleBackToEditor}><ArrowLeft size={16} /> Back</button>
        <div className="header-title">
          <span className="game-title">{projectScene?.name || 'Game Preview'}</span>
          {!gameStarted && <span className="status-badge ready">Ready</span>}
          {gameStarted && !gamePaused && !gameOver && !victory && <span className="status-badge running">Playing</span>}
          {gamePaused && <span className="status-badge paused">Paused</span>}
          {gameOver && <span className="status-badge dead">Game Over</span>}
          {victory && <span className="status-badge victory">Victory!</span>}
        </div>
        {gameStarted && !gameOver && !victory && (
          <button className="header-btn" onClick={handlePauseResume} title={gamePaused ? 'Resume' : 'Pause'}>
            {gamePaused ? <Play size={16} /> : <Zap size={16} />}
            {gamePaused ? 'Resume' : 'Pause'}
          </button>
        )}
      </div>

      <div className="game-preview-container">
        <div className="game-preview-canvas-container">
          <canvas ref={canvasRef} className="game-preview-canvas" />

          {/* ── Notification toasts ── */}
          <div style={{ position: 'absolute', top: 60, right: 10, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none' }}>
            {notifications.map(n => (
              <div key={n.id} style={{
                background: n.type === 'quest' ? 'rgba(139,92,246,0.9)' :
                  n.type === 'loot' ? 'rgba(234,179,8,0.9)' :
                  n.type === 'success' ? 'rgba(34,197,94,0.9)' :
                  n.type === 'error' ? 'rgba(239,68,68,0.9)' : 'rgba(30,41,59,0.9)',
                color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 13,
                backdropFilter: 'blur(4px)', minWidth: 180, animation: 'fadeIn 0.3s ease',
              }}>
                <div style={{ fontWeight: 'bold', fontSize: 12 }}>{n.icon} {n.title}</div>
                <div style={{ fontSize: 11, opacity: 0.9 }}>{n.message}</div>
              </div>
            ))}
          </div>

          {/* ── RPG Panels ── */}
          {activePanel === 'inventory' && (
            <div data-rpg-panel="inventory" style={{
              position: 'absolute', top: 50, left: 10, width: 360, maxHeight: 'calc(100% - 80px)',
              background: 'rgba(15,23,42,0.95)', borderRadius: 12, padding: 16,
              color: '#fff', overflowY: 'auto', zIndex: 50, border: '1px solid #334155',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>🎒 Inventory</h3>
                <button onClick={() => setActivePanel('none')} style={{ background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
              {/* Equipment */}
              <div style={{ marginBottom: 12, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Equipment</div>
                {(['weapon', 'armor', 'accessory'] as const).map(slot => {
                  const item = inventoryRef.current.equipment[slot];
                  return (
                    <div key={slot} style={{ fontSize: 13, padding: '2px 0' }}>
                      <span style={{ color: '#64748b' }}>{slot}:</span> {item ? `${item.icon} ${item.name}` : '— empty'}
                    </div>
                  );
                })}
              </div>
              {/* Items */}
              {inventoryItems.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>No items yet. Pick up items from the map!</div>}
              {inventoryItems.map(item => (
                <div key={item.id} style={{
                  padding: 8, marginBottom: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 8,
                  borderLeft: `3px solid ${
                    item.rarity === 'legendary' ? '#f59e0b' : item.rarity === 'epic' ? '#a855f7' :
                    item.rarity === 'rare' ? '#3b82f6' : item.rarity === 'uncommon' ? '#22c55e' : '#64748b'
                  }`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{item.icon} <strong>{item.name}</strong> {item.stackable ? `x${item.quantity}` : ''}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.rarity}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0' }}>{item.description}</div>
                  {item.stats && <div style={{ fontSize: 11, color: '#60a5fa' }}>
                    {Object.entries(item.stats).map(([k,v]) => `${k}: ${v}`).join(' | ')}
                  </div>}
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {item.usable && <button onClick={() => handleUseItem(item.id)} style={{ fontSize: 11, padding: '2px 8px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Use</button>}
                    {item.equippable && <button onClick={() => handleEquipItem(item.id)} style={{ fontSize: 11, padding: '2px 8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Equip</button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activePanel === 'quests' && (
            <div data-rpg-panel="quests" style={{
              position: 'absolute', top: 50, left: 10, width: 360, maxHeight: 'calc(100% - 80px)',
              background: 'rgba(15,23,42,0.95)', borderRadius: 12, padding: 16,
              color: '#fff', overflowY: 'auto', zIndex: 50, border: '1px solid #334155',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>📜 Quest Log</h3>
                <button onClick={() => setActivePanel('none')} style={{ background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
              {questList.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>No quests yet. Talk to NPCs with TAB!</div>}
              {questList.map(q => (
                <div key={q.id} style={{
                  padding: 10, marginBottom: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 8,
                  borderLeft: `3px solid ${q.status === 'complete' ? '#22c55e' : q.status === 'active' ? '#3b82f6' : '#64748b'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{q.name}</strong>
                    <span style={{ fontSize: 11, color: q.status === 'complete' ? '#22c55e' : '#fbbf24' }}>{q.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0' }}>{q.description}</div>
                  {q.objectives.map(obj => (
                    <div key={obj.id} style={{ fontSize: 12, color: obj.currentCount >= obj.requiredCount ? '#22c55e' : '#cbd5e1' }}>
                      {obj.currentCount >= obj.requiredCount ? '✅' : '⬜'} {obj.description} ({obj.currentCount}/{obj.requiredCount})
                    </div>
                  ))}
                  {q.status === 'complete' && q.completionText && (
                    <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4, fontStyle: 'italic' }}>{q.completionText}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activePanel === 'spellcraft' && (
            <div data-rpg-panel="spellcraft" style={{
              position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)',
              width: 320, background: 'rgba(15,23,42,0.95)', borderRadius: 12, padding: 16,
              color: '#fff', zIndex: 50, border: '1px solid #334155',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>🔮 Spell Crafting</h3>
                <button onClick={() => setActivePanel('none')} style={{ background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 10px' }}>Click cells to cycle elements. Match a recipe to learn a spell!</p>
              {/* 3x3 Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, maxWidth: 180, margin: '0 auto 12px' }}>
                {craftingGrid.flat().map((cell, i) => {
                  const r = Math.floor(i / 3), c = i % 3;
                  const color = cell === 'fire' ? '#ef4444' : cell === 'water' ? '#3b82f6' :
                    cell === 'earth' ? '#84cc16' : cell === 'air' ? '#e879f9' :
                    cell === 'shadow' ? '#a78bfa' : cell === 'light' ? '#fef3c7' : '#1e293b';
                  const icon = cell === 'fire' ? '🔥' : cell === 'water' ? '💧' :
                    cell === 'earth' ? '🪨' : cell === 'air' ? '💨' :
                    cell === 'shadow' ? '🌑' : cell === 'light' ? '✨' : '';
                  return (
                    <button key={i} onClick={() => handleCraftingCell(r, c)} style={{
                      width: 56, height: 56, background: color, border: cell ? '2px solid #fff' : '2px solid #334155',
                      borderRadius: 8, fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {icon}
                    </button>
                  );
                })}
              </div>
              {craftResult && (
                <div style={{ padding: 10, background: 'rgba(34,197,94,0.2)', borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: '#22c55e' }}>Recipe Found!</div>
                  <div style={{ fontSize: 12 }}>{craftResult}</div>
                  <button onClick={handleLearnSpell} style={{
                    marginTop: 6, padding: '6px 16px', background: '#22c55e', color: '#fff',
                    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold',
                  }}>Learn Spell</button>
                </div>
              )}
              {/* Known spells */}
              {learnedSpells.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Known Spells:</div>
                  {learnedSpells.map(spell => (
                    <div key={spell.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 12 }}>
                      <span>{spell.icon} {spell.name} <span style={{ color: '#94a3b8' }}>(DMG: {spell.damage}, MP: {spell.manaCost})</span></span>
                      <select
                        value={spell.hotkey || ''}
                        onChange={e => handleAssignHotkey(spell.id, parseInt(e.target.value))}
                        style={{ fontSize: 11, padding: '1px 4px', background: '#1e293b', color: '#fff', border: '1px solid #475569', borderRadius: 4 }}
                      >
                        <option value="">—</option>
                        {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Key {n}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activePanel === 'saveload' && (
            <div data-rpg-panel="saveload" style={{
              position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)',
              width: 380, background: 'rgba(15,23,42,0.95)', borderRadius: 12, padding: 16,
              color: '#fff', zIndex: 50, border: '1px solid #334155',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>💾 Save / Load</h3>
                <button onClick={() => setActivePanel('none')} style={{ background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
              {gamePaused && (
                <button onClick={handlePauseResume} style={{
                  width: '100%', marginBottom: 12, padding: '10px 0', background: '#22c55e', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
                }}>
                  ▶ Resume Game
                </button>
              )}
              {/* Quick save */}
              <button onClick={() => handleSave(0)} style={{
                width: '100%', marginBottom: 8, padding: '8px 0', background: '#3b82f6', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold',
              }}>
                <Save size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Quick Save (F5)
              </button>
              {/* Save slots */}
              {[0, 1, 2, 3, 4].map(slotId => {
                const slot = saveSlots.find(s => s.id === slotId);
                return (
                  <div key={slotId} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 8, marginBottom: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 6,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 'bold' }}>
                        {slotId === 0 ? '⚡ Quick Save' : `Slot ${slotId}`}
                      </div>
                      {slot ? (
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {new Date(slot.timestamp).toLocaleString()} • {Math.floor(slot.playTime / 1000)}s played
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: '#475569' }}>Empty</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => handleSave(slotId)} style={{ fontSize: 11, padding: '4px 8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                        <Save size={12} />
                      </button>
                      {slot && (
                        <>
                          <button onClick={() => handleLoad(slotId)} style={{ fontSize: 11, padding: '4px 8px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                            <Upload size={12} />
                          </button>
                          <button onClick={() => handleDeleteSave(slotId)} style={{ fontSize: 11, padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activePanel === 'dialogue' && (
            <div data-rpg-panel="dialogue" style={{
              position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              width: 500, background: 'rgba(15,23,42,0.95)', borderRadius: 12, padding: 16,
              color: '#fff', zIndex: 50, border: '1px solid #475569',
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 48, lineHeight: 1 }}>{dialoguePortrait}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#e9d5ff', marginBottom: 6 }}>{dialogueSpeaker}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 10 }}>{dialogueText}</div>
                  {dialogueChoices.map((choice, i) => (
                    <button key={i} onClick={() => handleDialogueChoice(choice.index)} style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', marginBottom: 4,
                      background: 'rgba(139,92,246,0.2)', border: '1px solid #7c3aed', borderRadius: 6,
                      color: '#e9d5ff', fontSize: 13, cursor: 'pointer',
                    }}>
                      {i + 1}. {choice.text}
                    </button>
                  ))}
                  {dialogueChoices.length === 0 && (
                    <button onClick={() => handleDialogueChoice(undefined as any)} style={{
                      padding: '6px 16px', background: '#7c3aed', border: 'none', borderRadius: 6,
                      color: '#fff', fontSize: 13, cursor: 'pointer',
                    }}>Continue</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Overlay screens ── */}
          {!gameStarted && (
            <div className="game-preview-start-screen">
              <div className="start-screen-content">
                <div className="start-screen-icon">🎮</div>
                <h2>Eclipse of Runes</h2>
                <p>Collect runes, craft spells, complete quests!</p>
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
