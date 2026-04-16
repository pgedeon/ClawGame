/**
 * Local stub — PreviewHUD was removed from @clawgame/engine during cleanup.
 * Renders HUD overlay: health/mana bars, score, minimap, TD stats.
 */

export interface HUDSpell { icon: string; hotkey: number; cooldown: number; maxCooldown: number; }
export interface HUDQuest { text: string; }
export interface HUDTowerDefenseStats {
  waveIndex: number; totalWaves: number; towerCount: number; enemiesAlive: number;
  coreHealth: number; coreMaxHealth: number; waveMessage?: string; waveMessageAlpha?: number;
  waveCountdown: number; selectedTower?: HUDSelectedTower | null;
}
export interface HUDSelectedTower {
  id: string; damage: number; range: number; fireRate: number;
  upgradeLevel: number; maxUpgradeLevel: number; upgradeCost: number;
  sellValue: number; canUpgrade: boolean; mana: number;
}
export interface HUDState {
  score: number; highScore?: number; health: number; maxHealth: number;
  mana: number; maxMana: number; fps: number; entityCount: number;
  timeSeconds: number; collectedRunes: number; weaponName?: string;
  spells: HUDSpell[]; questText?: string; towerDefense?: HUDTowerDefenseStats;
}
export interface MinimapEntity { x: number; y: number; type: string; }

interface RendererConfig { width: number; height: number; }

const TYPE_COLORS: Record<string, string> = {
  player: '#3b82f6', enemy: '#ef4444', collectible: '#f59e0b',
  obstacle: '#64748b', npc: '#22c55e', unknown: '#8b5cf6',
};

export class PreviewHUD {
  private ctx: CanvasRenderingContext2D;
  private config: RendererConfig;

  constructor(ctx: CanvasRenderingContext2D, config: RendererConfig) {
    this.ctx = ctx; this.config = config;
  }

  render(state: HUDState, minimapEntities: MinimapEntity[]): void {
    const ctx = this.ctx;
    this.renderStatsPanel(state);
    this.renderBars(state);
    if (state.spells.length > 0) this.renderSpellBar(state.spells);
    if (state.questText) this.renderQuestText(state.questText);
    if (state.towerDefense) this.renderTowerDefense(state.towerDefense);
    this.renderMinimap(minimapEntities);
  }

  private renderStatsPanel(state: HUDState): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.beginPath(); ctx.roundRect(10, 10, 200, 150, 8); ctx.fill();
    ctx.fillStyle = 'white'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`Score: ${state.score}`, 20, 35);
    if (state.highScore) {
      ctx.fillStyle = state.score >= state.highScore ? "#fbbf24" : "rgba(255,255,255,0.5)";
      ctx.font = "11px monospace"; ctx.fillText(`Best: ${state.highScore}`, 20, 52); ctx.fillStyle = "white";
    }
    ctx.font = '12px monospace';
    ctx.fillText(`FPS: ${state.fps}`, 20, 85); ctx.fillText(`Runes: ${state.collectedRunes}`, 20, 100);
    ctx.fillText(`Time: ${state.timeSeconds}s`, 20, 115); ctx.fillText(`Entities: ${state.entityCount}`, 20, 130);
    if (state.weaponName) { ctx.fillStyle = '#fbbf24'; ctx.fillText(`⚔ ${state.weaponName}`, 20, 145); }
  }

  private renderBars(state: HUDState): void {
    const ctx = this.ctx;
    const healthPct = state.health / state.maxHealth; const manaPct = state.mana / state.maxMana;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(20, 45, 100, 10);
    ctx.fillStyle = healthPct > 0.5 ? '#22c55e' : healthPct > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(20, 45, 100 * healthPct, 10);
    ctx.fillStyle = 'white'; ctx.font = '9px monospace'; ctx.fillText(`HP ${Math.round(state.health)}`, 125, 54);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(20, 58, 100, 10);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(20, 58, 100 * manaPct, 10);
    ctx.fillStyle = 'white'; ctx.fillText(`MP ${Math.round(state.mana)}`, 125, 67);
  }

  private renderSpellBar(spells: HUDSpell[]): void {
    const ctx = this.ctx; const barX = this.config.width / 2 - (spells.length * 44) / 2; const barY = this.config.height - 56;
    for (let i = 0; i < spells.length; i++) {
      const spell = spells[i]; const sx = barX + i * 44;
      ctx.fillStyle = spell.cooldown > 0 ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.8)';
      ctx.beginPath(); ctx.roundRect(sx, barY, 40, 40, 6); ctx.fill();
      ctx.strokeStyle = spell.cooldown > 0 ? '#475569' : '#60a5fa'; ctx.lineWidth = 2; ctx.strokeRect(sx, barY, 40, 40);
      ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(spell.icon, sx + 20, barY + 28);
      ctx.fillStyle = '#fff'; ctx.font = '9px monospace'; ctx.fillText(`${spell.hotkey}`, sx + 20, barY + 38);
      if (spell.cooldown > 0) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sx, barY, 40, 40 * Math.min(1, spell.cooldown / spell.maxCooldown)); }
    }
    ctx.textAlign = 'left';
  }

  private renderQuestText(text: string): void {
    const ctx = this.ctx; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.beginPath(); ctx.roundRect(10, 168, 280, 24, 6); ctx.fill();
    ctx.fillStyle = '#fbbf24'; ctx.font = '11px monospace'; ctx.textAlign = 'left'; ctx.fillText(`📜 ${text}`, 18, 184);
  }

  private renderTowerDefense(td: HUDTowerDefenseStats): void {
    const ctx = this.ctx; ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`Wave: ${td.waveIndex}/${td.totalWaves}`, 20, 100); ctx.fillText(`Towers: ${td.towerCount}`, 20, 115);
    ctx.fillText(`Enemies: ${td.enemiesAlive}`, 20, 130);
    if (td.coreMaxHealth > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(20, 135, 100, 10);
      const pct = td.coreHealth / td.coreMaxHealth;
      ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#eab308' : '#ef4444'; ctx.fillRect(20, 135, 100 * pct, 10);
      ctx.fillStyle = '#fff'; ctx.font = '9px monospace'; ctx.fillText('Bean HP', 125, 144);
    }
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px monospace'; ctx.fillText('[T] Place tower (30 mana)', 20, 160);
    if (td.selectedTower) this.renderSelectedTowerPanel(td.selectedTower);
    if (td.waveCountdown >= 0) {
      const boxW = 220, boxH = 36, boxX = this.config.width / 2 - boxW / 2, boxY = 14;
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 8); ctx.fill();
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
      ctx.strokeStyle = `rgba(251,191,36,${0.6 + pulse * 0.4})`; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`Next wave in ${td.waveCountdown.toFixed(1)}s`, this.config.width / 2, boxY + 24); ctx.textAlign = 'left';
    }
    if (td.waveMessage && td.waveMessageAlpha && td.waveMessageAlpha > 0) {
      ctx.fillStyle = `rgba(251,191,36,${td.waveMessageAlpha})`; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(td.waveMessage, this.config.width / 2, 60); ctx.textAlign = 'left';
    }
  }

  private renderSelectedTowerPanel(tower: HUDSelectedTower): void {
    const ctx = this.ctx; const panelX = this.config.width - 220, panelY = this.config.height - 160, panelW = 210, panelH = 150;
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 8); ctx.fill();
    ctx.strokeStyle = '#D2691E'; ctx.lineWidth = 2; ctx.strokeRect(panelX, panelY, panelW, panelH);
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left'; ctx.fillText('🏰 Tower Info', panelX + 10, panelY + 20);
    const stars = '★'.repeat(tower.upgradeLevel) + '☆'.repeat(tower.maxUpgradeLevel - tower.upgradeLevel);
    ctx.fillStyle = '#fbbf24'; ctx.font = '14px sans-serif'; ctx.fillText(stars, panelX + 120, panelY + 20);
    ctx.fillStyle = '#e2e8f0'; ctx.font = '11px monospace';
    ctx.fillText(`Damage: ${tower.damage.toFixed(1)}`, panelX + 10, panelY + 42);
    ctx.fillText(`Range: ${tower.range.toFixed(0)}`, panelX + 10, panelY + 58);
    ctx.fillText(`Fire Rate: ${(1000 / tower.fireRate).toFixed(1)}/s`, panelX + 10, panelY + 74);
    if (tower.canUpgrade) {
      const affordable = tower.mana >= tower.upgradeCost;
      ctx.fillStyle = affordable ? 'rgba(34,197,94,0.3)' : 'rgba(100,100,100,0.3)';
      ctx.beginPath(); ctx.roundRect(panelX + 10, panelY + 85, panelW - 20, 22, 4); ctx.fill();
      ctx.strokeStyle = affordable ? '#22c55e' : '#475569'; ctx.lineWidth = 1; ctx.strokeRect(panelX + 10, panelY + 85, panelW - 20, 22);
      ctx.fillStyle = affordable ? '#22c55e' : '#64748b'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`[U] Upgrade (${tower.upgradeCost} mana)`, panelX + panelW / 2, panelY + 100); ctx.textAlign = 'left';
    } else { ctx.fillStyle = '#64748b'; ctx.font = '11px monospace'; ctx.fillText('MAX LEVEL', panelX + 10, panelY + 100); }
    ctx.fillStyle = 'rgba(239,68,68,0.2)'; ctx.beginPath(); ctx.roundRect(panelX + 10, panelY + 115, panelW - 20, 22, 4); ctx.fill();
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1; ctx.strokeRect(panelX + 10, panelY + 115, panelW - 20, 22);
    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`[S] Sell (+${tower.sellValue} mana)`, panelX + panelW / 2, panelY + 130); ctx.textAlign = 'left';
  }

  private renderMinimap(entities: MinimapEntity[]): void {
    const ctx = this.ctx; const mmSize = 120, mmX = this.config.width - mmSize - 10, mmY = 10;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(mmX, mmY, mmSize, mmSize, 6); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.strokeRect(mmX, mmY, mmSize, mmSize);
    const scX = mmSize / this.config.width, scY = mmSize / this.config.height;
    for (const entity of entities) {
      ctx.fillStyle = TYPE_COLORS[entity.type] || '#8b5cf6';
      ctx.fillRect(mmX + entity.x * scX - 2, mmY + entity.y * scY - 2, 4, 4);
    }
  }

  updateConfig(config: Partial<RendererConfig>): void { this.config = { ...this.config, ...config }; }
  destroy(): void {}
}
