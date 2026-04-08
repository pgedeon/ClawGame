/**
 * @clawgame/web - Game Preview Page
 * Loads and runs actual game content from project with enhanced UX
 */
import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Play, X, Zap, Code, ArrowLeft, Skull, Trophy, Heart } from 'lucide-react';
import '../game-preview.css';
import { logger } from '../utils/logger';
interface ProjectScene {
  name: string;
  description?: string;
  entities: Array<{
    id: string;
    type?: string;
    transform?: {
      x: number;
      y: number;
      scaleX: number;
      scaleY: number;
      rotation: number;
    };
    components: Record<string, any>;
  }>;
  metadata?: {
    features?: string[];
  };
}
interface GameStats {
  fps: number;
  entities: number;
  memory: string;
}
interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  createdAt: number;
}
const GamePreviewContent: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const gameStatsRef = useRef<GameStats>({ fps: 60, entities: 0, memory: '0MB' });
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectScene, setProjectScene] = useState<ProjectScene | null>(null);
  const [gameStats, setGameStats] = useState<GameStats>({ fps: 60, entities: 0, memory: '0MB' });
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [collectedRunes, setCollectedRunes] = useState<string[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  // Load project scene
  useEffect(() => {
    if (!projectId) return;
    const loadProjectScene = async () => {
      try {
        setLoading(true);
        setError(null);
        const project = await api.getProject(projectId);
        try {
          const sceneData = await api.readFile(projectId, 'scenes/main-scene.json');
          const parsedScene: ProjectScene = JSON.parse(sceneData.content);
          const validatedEntities = (parsedScene.entities || []).map(entity => ({
            id: entity.id || `entity-${Math.random().toString(36).substr(2, 9)}`,
            type: entity.type || 'unknown',
            transform: entity.transform || { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
            components: entity.components || {},
          }));
          const validatedScene: ProjectScene = {
            name: parsedScene.name || 'Main Scene',
            description: parsedScene.description,
            entities: validatedEntities,
            metadata: parsedScene.metadata
          };
          setProjectScene(validatedScene);
        } catch (sceneErr) {
          const defaultScene: ProjectScene = {
            name: 'Main Scene',
            entities: [
              {
                id: 'player-1',
                transform: { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
                components: {
                  playerInput: true,
                  movement: { vx: 0, vy: 0, speed: 200 },
                  sprite: { width: 32, height: 32, color: '#3b82f6' }
                }
              },
              {
                id: 'enemy-1',
                transform: { x: 600, y: 400, scaleX: 1, scaleY: 1, rotation: 0 },
                components: {
                  ai: { type: 'patrol', speed: 50 },
                  movement: { vx: 0, vy: 0, speed: 50 },
                  sprite: { width: 32, height: 32, color: '#ef4444' }
                }
              },
              {
                id: 'coin-1',
                transform: { x: 500, y: 200, scaleX: 1, scaleY: 1, rotation: 0 },
                components: {
                  collision: { width: 16, height: 16, type: 'collectible' },
                  sprite: { width: 16, height: 16, color: '#fbbf24' }
                }
              },
              {
                id: 'coin-2',
                transform: { x: 300, y: 400, scaleX: 1, scaleY: 1, rotation: 0 },
                components: {
                  collision: { width: 16, height: 16, type: 'collectible' },
                  sprite: { width: 16, height: 16, color: '#fbbf24' }
                }
              }
            ]
          };
          setProjectScene(defaultScene);
        }
      } catch (err) {
        logger.error('Failed to load project:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };
    loadProjectScene();
  }, [projectId]);
  // Initialize game loop
  useEffect(() => {
    if (!canvasRef.current || !projectScene) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    // Initialize game state
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
    let invincibleTimer = 0;
    let gameTime = 0;
    const collectedRuneIds: string[] = [];
    // Input handling
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === 'Escape') {
        if (gameStarted && !gamePaused && !gameOver && !victory) {
          setGamePaused(true);
        } else if (gamePaused) {
          setGamePaused(false);
          lastTime = performance.now();
        }
      }
      // Spacebar to shoot
      if (e.key === ' ' && gameStarted && !gamePaused && !gameOver && !victory) {
        e.preventDefault();
        const currentTime = performance.now();
        const shootCooldown = 300; // ms
        if (currentTime - lastShotTime > shootCooldown) {
          const player = entities.get('player') || entities.get('player-1');
          if (player) {
            // Determine shoot direction based on last movement or default to right
            let shootDirX = 0;
            let shootDirY = 0;
            if (keys['arrowleft'] || keys['a']) shootDirX = -1;
            else if (keys['arrowright'] || keys['d']) shootDirX = 1;
            else if (keys['arrowup'] || keys['w']) shootDirY = -1;
            else if (keys['arrowdown'] || keys['s']) shootDirY = 1;
            else shootDirX = 1; // Default to right
            // Normalize diagonal shooting
            if (shootDirX !== 0 && shootDirY !== 0) {
              const len = Math.sqrt(shootDirX * shootDirX + shootDirY * shootDirY);
              shootDirX /= len;
              shootDirY /= len;
            }
            const projectileSpeed = 500;
            projectiles.push({
              id: `proj-${Date.now()}-${Math.random()}`,
              x: player.transform.x,
              y: player.transform.y,
              vx: shootDirX * projectileSpeed,
              vy: shootDirY * projectileSpeed,
              damage: 20,
              createdAt: currentTime
            });
            lastShotTime = currentTime;
          }
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    // Check collision between two entities
    const checkCollision = (a: any, b: any) => {
      const dx = a.transform.x - b.transform.x;
      const dy = a.transform.y - b.transform.y;
      const minDist = (a.width + b.width) / 2;
      return Math.sqrt(dx * dx + dy * dy) < minDist;
    };
    // Game update logic
    const update = () => {
      if (!gameStarted || gamePaused || gameOver || victory) return;
      const currentTime = performance.now();
      const deltaTime = Math.min(currentTime - lastTime, 50);
      lastTime = currentTime;
      gameTime += deltaTime;
      setTimeElapsed(Math.floor(gameTime / 1000));
      // Update invincibility timer
      if (invincibleTimer > 0) {
        invincibleTimer -= deltaTime;
      }
      // Update projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        proj.x += proj.vx * (deltaTime / 1000);
        proj.y += proj.vy * (deltaTime / 1000);
        // Remove off-screen projectiles
        if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
          projectiles.splice(i, 1);
          continue;
        }
        // Check projectile hits on enemies
        const enemies = Array.from(entities.values()).filter(e => e.type === 'enemy');
        for (const enemy of enemies) {
          const dx = proj.x - enemy.transform.x;
          const dy = proj.y - enemy.transform.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < (enemy.width + 10) / 2) {
            enemy.health -= proj.damage;
            projectiles.splice(i, 1);
            // Enemy death
            if (enemy.health <= 0) {
              score += 50;
              entities.delete(enemy.id);
            }
            break;
          }
        }
        // Check projectile hits on obstacles
        const obstacles = Array.from(entities.values()).filter(e => e.type === 'obstacle');
        for (const obstacle of obstacles) {
          const dx = proj.x - obstacle.transform.x;
          const dy = proj.y - obstacle.transform.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < (obstacle.width + 10) / 2) {
            projectiles.splice(i, 1);
            break;
          }
        }
      }
      // Update entities
      entities.forEach((entity, id) => {
        // Player movement with obstacle collision
        if (entity.components?.playerInput) {
          const speed = entity.components.movement?.speed || 200;
          let newVx = 0;
          let newVy = 0;
          if (keys['arrowleft'] || keys['a']) newVx = -speed;
          if (keys['arrowright'] || keys['d']) newVx = speed;
          if (keys['arrowup'] || keys['w']) newVy = -speed;
          if (keys['arrowdown'] || keys['s']) newVy = speed;
          // Try X movement
          const nextX = entity.transform.x + newVx * (deltaTime / 1000);
          const testX = { ...entity, transform: { ...entity.transform, x: nextX } };
          let canMoveX = true;
          const obstacles = Array.from(entities.values()).filter(e => e.type === 'obstacle');
          for (const obstacle of obstacles) {
            if (id !== obstacle.id && checkCollision(testX, obstacle)) {
              canMoveX = false;
              break;
            }
          }
          if (canMoveX) {
            entity.transform.x = nextX;
          }
          // Try Y movement
          const nextY = entity.transform.y + newVy * (deltaTime / 1000);
          const testY = { ...entity, transform: { ...entity.transform, y: nextY } };
          let canMoveY = true;
          for (const obstacle of obstacles) {
            if (id !== obstacle.id && checkCollision(testY, obstacle)) {
              canMoveY = false;
              break;
            }
          }
          if (canMoveY) {
            entity.transform.y = nextY;
          }
          // Keep player in bounds
          const margin = entity.width / 2;
          entity.transform.x = Math.max(margin, Math.min(canvas.width - margin, entity.transform.x));
          entity.transform.y = Math.max(margin, Math.min(canvas.height - margin, entity.transform.y));
        }
        // Enemy AI - patrol and chase
        if (entity.type === 'enemy' && gameStarted) {
          const player = entities.get('player') || entities.get('player-1');
          const patrolSpeed = entity.components.ai?.speed || 50;
          const time = currentTime / 1000;
          if (player) {
            const dx = player.transform.x - entity.transform.x;
            const dy = player.transform.y - entity.transform.y;
            const distToPlayer = Math.sqrt(dx * dx + dy * dy);
            // Chase player if close, otherwise patrol
            if (distToPlayer < 200) {
              // Chase player
              const chaseSpeed = patrolSpeed * 0.6;
              entity.transform.x += (dx / distToPlayer) * chaseSpeed * (deltaTime / 1000);
              entity.transform.y += (dy / distToPlayer) * chaseSpeed * (deltaTime / 1000);
              // Damage player on contact
              if (distToPlayer < (entity.width + player.width) / 2 && invincibleTimer <= 0) {
                health -= entity.damage || 10;
                invincibleTimer = 1000; // 1 second invincibility
                if (health <= 0) {
                  setGameOver(true);
                }
              }
            } else {
              // Patrol in figure-8 pattern
              const origin = entity.patrolOrigin;
              entity.transform.x = origin.x + Math.sin(time * (patrolSpeed / 100) + entity.patrolOffset) * 100;
              entity.transform.y = origin.y + Math.cos(time * (patrolSpeed / 80) + entity.patrolOffset * 2) * 80;
            }
          }
          // Keep enemies in bounds
          entity.transform.x = Math.max(entity.width / 2, Math.min(canvas.width - entity.width / 2, entity.transform.x));
          entity.transform.y = Math.max(entity.height / 2, Math.min(canvas.height - entity.height / 2, entity.transform.y));
        }
        // Animation for collectibles
        if (entity.type === 'collectible') {
          entity.transform.rotation += deltaTime * 0.003;
        }
      });
      // Collectible collection
      const player = entities.get('player') || entities.get('player-1');
      if (player) {
        const collectibles = Array.from(entities.values()).filter(e => e.type === 'collectible');
        collectibles.forEach(item => {
          const dx = player.transform.x - item.transform.x;
          const dy = player.transform.y - item.transform.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < (player.width + item.width) / 2) {
            const collectible = item.components.collectible;
            if (collectible) {
              // Handle different collectible types
              if (collectible.type === 'health') {
                health = Math.min(100, health + (collectible.healAmount || 30));
                score += collectible.value || 30;
              } else if (collectible.type === 'rune') {
                if (!collectedRuneIds.includes(item.id)) {
                  collectedRuneIds.push(item.id);
                  score += collectible.value || 25;
                  setCollectedRunes([...collectedRuneIds]);
                }
              } else {
                score += collectible.value || 10;
              }
            }
            entities.delete(item.id);
          }
        });
      }
      // Check win condition - all runes collected
      const allRunes = projectScene.entities.filter(e => e.type === 'collectible' && e.components.collectible?.type === 'rune');
      if (allRunes.length > 0 && collectedRuneIds.length >= allRunes.length) {
        setVictory(true);
      }
      // Update stats
      frameCount++;
      if (frameCount % 10 === 0) {
        setPlayerScore(score);
        setPlayerHealth(health);
      }
      if (frameCount % 30 === 0) {
        const fps = Math.round(1000 / deltaTime);
        const memory = typeof (performance as any).memory === 'object'
          ? `${((performance as any).memory.usedJSHeapSize || 0) / 1048576 | 0}MB`
          : 'N/A';
        gameStatsRef.current = {
          fps,
          entities: entities.size + projectiles.length,
          memory
        };
        setGameStats(prev => ({
          ...prev,
          fps,
          entities: entities.size + projectiles.length,
          memory
        }));
      }
    };
    // Enhanced render function
    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Draw grid
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.2)';
      ctx.lineWidth = 1;
      const gridSize = 32;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      // Draw obstacles (walls)
      entities.forEach((entity) => {
        if (entity.type === 'obstacle') {
          const { x, y, scaleX, scaleY } = entity.transform;
          const width = entity.width;
          const height = entity.height;
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(scaleX, scaleY);
          // Draw wall with 3D effect
          ctx.fillStyle = '#475569';
          ctx.fillRect(-width/2, -height/2, width, height);
          // Top highlight
          ctx.fillStyle = '#64748b';
          ctx.fillRect(-width/2, -height/2, width, height * 0.2);
          // Right shadow
          ctx.fillStyle = '#334155';
          ctx.fillRect(width/2 - width * 0.1, -height/2, width * 0.1, height);
          ctx.restore();
        }
      });
      // Draw collectibles
      entities.forEach((entity, id) => {
        if (entity.type === 'collectible') {
          const { x, y, scaleX, scaleY, rotation } = entity.transform;
          const width = entity.width;
          const height = entity.height;
          const collectible = entity.components.collectible;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rotation);
          ctx.scale(scaleX, scaleY);
          // Glow effect
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, width);
          gradient.addColorStop(0, entity.color + '80');
          gradient.addColorStop(1, entity.color + '00');
          ctx.fillStyle = gradient;
          ctx.fillRect(-width, -height, width * 2, height * 2);
          // Draw collectible shape
          ctx.fillStyle = entity.color;
          ctx.beginPath();
          if (collectible?.type === 'rune') {
            // Diamond shape for runes
            ctx.moveTo(0, -height/2);
            ctx.lineTo(width/2, 0);
            ctx.lineTo(0, height/2);
            ctx.lineTo(-width/2, 0);
            ctx.closePath();
          } else if (collectible?.type === 'health') {
            // Circle for health
            ctx.arc(0, 0, width/2, 0, Math.PI * 2);
          } else {
            // Square for gold
            ctx.fillRect(-width/2, -height/2, width, height);
          }
          ctx.fill();
          // Inner detail
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          if (collectible?.type === 'rune') {
            ctx.beginPath();
            ctx.arc(0, 0, width/4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      });
      // Draw projectiles
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 10;
      projectiles.forEach(proj => {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
      // Draw enemies
      entities.forEach((entity, id) => {
        if (entity.type === 'enemy') {
          const { x, y, scaleX, scaleY } = entity.transform;
          const width = entity.width;
          const height = entity.height;
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(scaleX, scaleY);
          // Draw enemy body with rounded corners
          ctx.fillStyle = entity.color;
          ctx.beginPath();
          ctx.roundRect(-width/2, -height/2, width, height, 6);
          ctx.fill();
          // Draw angry eyes
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.ellipse(-width/5, -height/5, width/6, height/6, 0, 0, Math.PI * 2);
          ctx.ellipse(width/5, -height/5, width/6, height/6, 0, 0, Math.PI * 2);
          ctx.fill();
          // Pupils
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(-width/5, -height/5, width/12, 0, Math.PI * 2);
          ctx.arc(width/5, -height/5, width/12, 0, Math.PI * 2);
          ctx.fill();
          // Health bar
          const healthPercent = entity.health / entity.maxHealth;
          const barWidth = width + 8;
          const barHeight = 4;
          ctx.fillStyle = '#1f2937';
          ctx.fillRect(-barWidth/2, -height/2 - 10, barWidth, barHeight);
          ctx.fillStyle = healthPercent > 0.5 ? '#22c55e' : healthPercent > 0.25 ? '#eab308' : '#ef4444';
          ctx.fillRect(-barWidth/2, -height/2 - 10, barWidth * healthPercent, barHeight);
          // Entity label
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${entity.health}/${entity.maxHealth}`, 0, -height/2 - 14);
          ctx.restore();
        }
      });
      // Draw player
      const player = entities.get('player') || entities.get('player-1');
      if (player) {
        const { x, y, scaleX, scaleY } = player.transform;
        const width = player.width;
        const height = player.height;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scaleX, scaleY);
        // Invincibility flash effect
        if (invincibleTimer > 0 && Math.floor(invincibleTimer / 100) % 2 === 0) {
          ctx.globalAlpha = 0.5;
        }
        // Draw player with rounded corners
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.roundRect(-width/2, -height/2, width, height, 8);
        ctx.fill();
        // Draw friendly eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-width/5, -height/6, width/5, height/5, 0, 0, Math.PI * 2);
        ctx.ellipse(width/5, -height/6, width/5, height/5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pupils
        ctx.fillStyle = '#1e3a5f';
        ctx.beginPath();
        ctx.arc(-width/5, -height/6, width/10, 0, Math.PI * 2);
        ctx.arc(width/5, -height/6, width/10, 0, Math.PI * 2);
        ctx.fill();
        // Border glow
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 10;
        ctx.strokeRect(-width/2, -height/2, width, height);
        ctx.shadowBlur = 0;
        // Player label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 2;
        ctx.fillText('YOU', 0, height/2 + 12);
        ctx.shadowBlur = 0;
        ctx.restore();
      }
      // Draw UI
      const stats = gameStatsRef.current;
      // Stats panel (top left)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(10, 10, 180, 130, 8);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, 20, 35);
      // Health bar
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(20, 45, 100, 12);
      ctx.fillStyle = health > 50 ? '#22c55e' : health > 25 ? '#eab308' : '#ef4444';
      ctx.fillRect(20, 45, 100 * (health / 100), 12);
      ctx.fillStyle = 'white';
      ctx.font = '10px monospace';
      ctx.fillText(`${Math.round(health)}%`, 130, 54);
      ctx.font = '12px monospace';
      ctx.fillText(`FPS: ${stats.fps}`, 20, 70);
      ctx.fillText(`Runes: ${collectedRuneIds.length}`, 20, 85);
      ctx.fillText(`Time: ${timeElapsed}s`, 20, 100);
      ctx.fillText(`Entities: ${stats.entities}`, 20, 115);
      // Controls panel (top right)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(canvas.width - 200, 10, 190, 110, 8);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Controls:', canvas.width - 190, 32);
      ctx.font = '11px monospace';
      ctx.fillText('WASD/Arrows: Move', canvas.width - 190, 50);
      ctx.fillText('SPACE: Shoot', canvas.width - 190, 66);
      ctx.fillText('ESC: Pause', canvas.width - 190, 82);
      ctx.font = '10px monospace';
      const statusText = gameStarted && !gamePaused ? 'RUNNING' : gamePaused ? 'PAUSED' : 'READY';
      ctx.fillStyle = gameStarted && !gamePaused ? '#22c55e' : gamePaused ? '#eab308' : '#6b7280';
      ctx.fillText(statusText, canvas.width - 190, 100);
      // Scene name at bottom
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(10, canvas.height - 35, 300, 28, 8);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(projectScene?.name || "Game Preview", 20, canvas.height - 17);
      if (projectScene?.description) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(projectScene.description.substring(0, 40), 20, canvas.height - 3);
      }
    };
    const gameLoop = () => {
      update();
      render();
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    gameLoop();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [projectScene, gameStarted, gamePaused, gameOver, victory]);
  const handleStartGame = () => {
    setGameStarted(true);
    setGamePaused(false);
    setGameOver(false);
    setVictory(false);
    setPlayerScore(0);
    setPlayerHealth(100);
    setCollectedRunes([]);
    setTimeElapsed(0);
  };
  const handleBackToEditor = () => {
    navigate(`/project/${projectId}`);
  };
  const handlePauseResume = () => {
    setGamePaused(!gamePaused);
  };
  const handleRestart = () => {
    setGameOver(false);
    setVictory(false);
    setPlayerScore(0);
    setPlayerHealth(100);
    setCollectedRunes([]);
    setTimeElapsed(0);
    setGamePaused(false);
  };
  if (loading) {
    return (
      <div className="game-preview">
        <div className="game-preview-loading">
          <div className="game-preview-spinner" />
          <p>Loading game...</p>
          <p className="game-preview-subtitle">Loading project data and initializing game engine</p>
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
        <button
          className="header-btn"
          onClick={handleBackToEditor}
          title="Back to editor"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="header-title">
          <span className="game-title">{projectScene?.name || "Game Preview"}</span>
          {!gameStarted && <span className="status-badge ready">Ready</span>}
          {gameStarted && !gamePaused && !gameOver && !victory && <span className="status-badge running">Playing</span>}
          {gamePaused && <span className="status-badge paused">Paused</span>}
          {gameOver && <span className="status-badge dead">Game Over</span>}
          {victory && <span className="status-badge victory">Victory!</span>}
        </div>
        {gameStarted && !gameOver && !victory && (
          <button
            className="header-btn"
            onClick={handlePauseResume}
            title={gamePaused ? 'Resume' : 'Pause'}
          >
            {gamePaused ? <Play size={16} /> : <Zap size={16} />}
            {gamePaused ? 'Resume' : 'Pause'}
          </button>
        )}
      </div>
      <div className="game-preview-container">
        <div className="game-preview-canvas-container">
          <canvas ref={canvasRef} className="game-preview-canvas" />
          {!gameStarted && (
            <div className="game-preview-start-screen">
              <div className="start-screen-content">
                <div className="start-screen-icon">🎮</div>
                <h2>Rune Rush</h2>
                <p>Collect all runes while avoiding enemies!</p>
                <div className="start-screen-info">
                  <div className="info-item">
                    <span className="info-icon">🎯</span>
                    <span>WASD/Arrows to move</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">🔥</span>
                    <span>SPACE to shoot enemies</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">💎</span>
                    <span>Collect all runes to win</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">💚</span>
                    <span>Grab health potions to heal</span>
                  </div>
                </div>
                <button
                  className="start-game-btn"
                  onClick={handleStartGame}
                >
                  <Play size={20} />
                  Start Game
                </button>
              </div>
            </div>
          )}
          {gamePaused && (
            <div className="game-preview-pause-overlay">
              <div className="pause-screen-content">
                <div className="pause-screen-icon">⏸️</div>
                <h2>Game Paused</h2>
                <p>Press ESC or click Resume to continue</p>
                <button
                  className="resume-game-btn"
                  onClick={handlePauseResume}
                >
                  <Play size={20} />
                  Resume Game
                </button>
              </div>
            </div>
          )}
          {gameOver && (
            <div className="game-preview-gameover-overlay">
              <div className="gameover-screen-content">
                <div className="gameover-screen-icon">
                  <Skull size={64} />
                </div>
                <h2>Game Over</h2>
                <p className="gameover-score">Score: {playerScore}</p>
                <p className="gameover-stats">Runes collected: {collectedRunes.length}</p>
                <p className="gameover-time">Time survived: {timeElapsed}s</p>
                <div className="gameover-buttons">
                  <button
                    className="restart-btn"
                    onClick={handleRestart}
                  >
                    <Play size={20} />
                    Try Again
                  </button>
                  <button
                    className="back-btn"
                    onClick={handleBackToEditor}
                  >
                    <ArrowLeft size={20} />
                    Back to Editor
                  </button>
                </div>
              </div>
            </div>
          )}
          {victory && (
            <div className="game-preview-victory-overlay">
              <div className="victory-screen-content">
                <div className="victory-screen-icon">
                  <Trophy size={64} />
                </div>
                <h2>Victory!</h2>
                <p className="victory-score">Score: {playerScore}</p>
                <p className="victory-time">Time: {timeElapsed}s</p>
                <p className="victory-health">Health remaining: {Math.round(playerHealth)}%</p>
                <div className="victory-buttons">
                  <button
                    className="restart-btn"
                    onClick={handleRestart}
                  >
                    <Play size={20} />
                    Play Again
                  </button>
                  <button
                    className="back-btn"
                    onClick={handleBackToEditor}
                  >
                    <ArrowLeft size={20} />
                    Back to Editor
                  </button>
                </div>
              </div>
            </div>
          )}
          {!projectScene && (
            <div className="game-preview-placeholder">
              <p>No scene data available</p>
              <button
                className="action-btn"
                onClick={handleBackToEditor}
              >
                <Code size={16} />
                Create Scene
              </button>
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
