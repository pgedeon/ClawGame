/**
 * @clawgame/engine - Preview HUD Renderer
 *
 * Renders the game preview HUD overlay: health/mana bars, score panel,
 * minimap, spell bar, quest text, and tower defense stats.
 *
 * Takes a HUDState snapshot (from GameLoopCoordinator + entity data)
 * so it's decoupled from React and the canvas session.
 *
 * M14 runtime unification: moves HUD rendering out of legacyCanvasSession.
 */

import type { RendererConfig } from '../types';

// ─── HUD State ───

export interface HUDSpell {
  icon: string;
  hotkey: number;
  cooldown: number;
  maxCooldown: number;
}

export interface HUDQuest {
  text: string;
}

export interface HUDTowerDefenseStats {
  waveIndex: number;
  totalWaves: number;
  towerCount: number;
  enemiesAlive: number;
  coreHealth: number;
  coreMaxHealth: number;
  waveMessage?: string;
  waveMessageAlpha?: number;
  selectedTower?: HUDSelectedTower | null;
}

export interface HUDSelectedTower {
  id: string;
  damage: number;
  range: number;
  fireRate: number;
  upgradeLevel: number;
  maxUpgradeLevel: number;
  upgradeCost: number;
  sellValue: number;
  canUpgrade: boolean;
  mana: number;
}

export interface HUDState {
  score: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  fps: number;
  entityCount: number;
  timeSeconds: number;
  collectedRunes: number;
  weaponName?: string;
  spells: HUDSpell[];
  questText?: string;
  towerDefense?: HUDTowerDefenseStats;
}

// ─── Minimap Entity ───

export interface MinimapEntity {
  x: number;
  y: number;
  type: string;
}

// ─── Type Colors ───

const TYPE_COLORS: Record<string, string> = {
  player: '#3b82f6',
  enemy: '#ef4444',
  collectible: '#f59e0b',
  obstacle: '#64748b',
  npc: '#22c55e',
  unknown: '#8b5cf6',
};

// ─── HUD Renderer ───

export class PreviewHUD {
  private ctx: CanvasRenderingContext2D;
  private config: RendererConfig;

  constructor(ctx: CanvasRenderingContext2D, config: RendererConfig) {
    this.ctx = ctx;
    this.config = config;
  }

  /** Render the full HUD overlay */
  render(state: HUDState, minimapEntities: MinimapEntity[]): void {
    const ctx = this.ctx;

    // Stats panel
    this.renderStatsPanel(state);

    // Health & Mana bars
    this.renderBars(state);

    // Spell bar
    if (state.spells.length > 0) {
      this.renderSpellBar(state.spells);
    }

    // Quest text
    if (state.questText) {
      this.renderQuestText(state.questText);
    }

    // Tower defense overlay
    if (state.towerDefense) {
      this.renderTowerDefense(state.towerDefense);
    }

    // Minimap
    this.renderMinimap(minimapEntities);
  }

  private renderStatsPanel(state: HUDState): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 200, 150, 8);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${state.score}`, 20, 35);

    ctx.font = '12px monospace';
    ctx.fillText(`FPS: ${state.fps}`, 20, 85);
    ctx.fillText(`Runes: ${state.collectedRunes}`, 20, 100);
    ctx.fillText(`Time: ${state.timeSeconds}s`, 20, 115);
    ctx.fillText(`Entities: ${state.entityCount}`, 20, 130);

    if (state.weaponName) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`⚔ ${state.weaponName}`, 20, 145);
    }
  }

  private renderBars(state: HUDState): void {
    const ctx = this.ctx;
    const healthPct = state.health / state.maxHealth;
    const manaPct = state.mana / state.maxMana;

    // Health bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(20, 45, 100, 10);
    ctx.fillStyle = healthPct > 0.5 ? '#22c55e' : healthPct > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(20, 45, 100 * healthPct, 10);
    ctx.fillStyle = 'white';
    ctx.font = '9px monospace';
    ctx.fillText(`HP ${Math.round(state.health)}`, 125, 54);

    // Mana bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(20, 58, 100, 10);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(20, 58, 100 * manaPct, 10);
    ctx.fillStyle = 'white';
    ctx.fillText(`MP ${Math.round(state.mana)}`, 125, 67);
  }

  private renderSpellBar(spells: HUDSpell[]): void {
    const ctx = this.ctx;
    const barX = this.config.width / 2 - (spells.length * 44) / 2;
    const barY = this.config.height - 56;

    for (let i = 0; i < spells.length; i++) {
      const spell = spells[i];
      const sx = barX + i * 44;

      ctx.fillStyle = spell.cooldown > 0 ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.8)';
      ctx.beginPath();
      ctx.roundRect(sx, barY, 40, 40, 6);
      ctx.fill();

      ctx.strokeStyle = spell.cooldown > 0 ? '#475569' : '#60a5fa';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, barY, 40, 40);

      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(spell.icon, sx + 20, barY + 28);

      ctx.fillStyle = '#fff';
      ctx.font = '9px monospace';
      ctx.fillText(`${spell.hotkey}`, sx + 20, barY + 38);

      if (spell.cooldown > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(sx, barY, 40, 40 * Math.min(1, spell.cooldown / spell.maxCooldown));
      }
    }

    // Reset alignment
    ctx.textAlign = 'left';
  }

  private renderQuestText(text: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.roundRect(10, 168, 280, 24, 6);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`📜 ${text}`, 18, 184);
  }

  private renderTowerDefense(td: HUDTowerDefenseStats): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Wave: ${td.waveIndex}/${td.totalWaves}`, 20, 100);
    ctx.fillText(`Towers: ${td.towerCount}`, 20, 115);
    ctx.fillText(`Enemies: ${td.enemiesAlive}`, 20, 130);

    // Core health bar
    if (td.coreMaxHealth > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(20, 135, 100, 10);
      const pct = td.coreHealth / td.coreMaxHealth;
      ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillRect(20, 135, 100 * pct, 10);
      ctx.fillStyle = '#fff';
      ctx.font = '9px monospace';
      ctx.fillText('Bean HP', 125, 144);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('[T] Place tower (30 mana)', 20, 160);

    // Selected tower info panel
    if (td.selectedTower) {
      this.renderSelectedTowerPanel(td.selectedTower);
    }

    // Wave announcement
    if (td.waveMessage && td.waveMessageAlpha && td.waveMessageAlpha > 0) {
      ctx.fillStyle = `rgba(251,191,36,${td.waveMessageAlpha})`;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(td.waveMessage, this.config.width / 2, 50);
      ctx.textAlign = 'left';
    }
  }

  private renderSelectedTowerPanel(tower: HUDSelectedTower): void {
    const ctx = this.ctx;
    const panelX = this.config.width - 220;
    const panelY = this.config.height - 160;
    const panelW = 210;
    const panelH = 150;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#D2691E';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    // Title
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('🏰 Tower Info', panelX + 10, panelY + 20);

    // Upgrade level stars
    const stars = '★'.repeat(tower.upgradeLevel) + '☆'.repeat(tower.maxUpgradeLevel - tower.upgradeLevel);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '14px sans-serif';
    ctx.fillText(stars, panelX + 120, panelY + 20);

    // Stats
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px monospace';
    ctx.fillText(`Damage: ${tower.damage.toFixed(1)}`, panelX + 10, panelY + 42);
    ctx.fillText(`Range: ${tower.range.toFixed(0)}`, panelX + 10, panelY + 58);
    ctx.fillText(`Fire Rate: ${(1000 / tower.fireRate).toFixed(1)}/s`, panelX + 10, panelY + 74);

    // Upgrade button
    if (tower.canUpgrade) {
      const affordable = tower.mana >= tower.upgradeCost;
      ctx.fillStyle = affordable ? 'rgba(34,197,94,0.3)' : 'rgba(100,100,100,0.3)';
      ctx.beginPath();
      ctx.roundRect(panelX + 10, panelY + 85, panelW - 20, 22, 4);
      ctx.fill();
      ctx.strokeStyle = affordable ? '#22c55e' : '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(panelX + 10, panelY + 85, panelW - 20, 22);
      ctx.fillStyle = affordable ? '#22c55e' : '#64748b';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`[U] Upgrade (${tower.upgradeCost} mana)`, panelX + panelW / 2, panelY + 100);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      ctx.fillText('MAX LEVEL', panelX + 10, panelY + 100);
    }

    // Sell button
    ctx.fillStyle = 'rgba(239,68,68,0.2)';
    ctx.beginPath();
    ctx.roundRect(panelX + 10, panelY + 115, panelW - 20, 22, 4);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 10, panelY + 115, panelW - 20, 22);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`[S] Sell (+${tower.sellValue} mana)`, panelX + panelW / 2, panelY + 130);
    ctx.textAlign = 'left';
  }

  private renderMinimap(entities: MinimapEntity[]): void {
    const ctx = this.ctx;
    const mmSize = 120;
    const mmX = this.config.width - mmSize - 10;
    const mmY = 10;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(mmX, mmY, mmSize, mmSize, 6);
    ctx.fill();

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX, mmY, mmSize, mmSize);

    const scX = mmSize / this.config.width;
    const scY = mmSize / this.config.height;

    for (const entity of entities) {
      ctx.fillStyle = TYPE_COLORS[entity.type] || '#8b5cf6';
      ctx.fillRect(mmX + entity.x * scX - 2, mmY + entity.y * scY - 2, 4, 4);
    }
  }

  /** Update config (e.g. on canvas resize) */
  updateConfig(config: Partial<RendererConfig>): void {
    this.config = { ...this.config, ...config };
  }

  destroy(): void {
    // Nothing to clean up
  }
}
