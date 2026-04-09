/**
 * Eclipse of Runes — Collectible Items
 * Runes, gold, potions that can be picked up by the player.
 */

import { Player } from './player';

export type ItemType = 'rune' | 'gold' | 'potion' | 'key' | 'lore';

export interface CollectibleDef {
  id: string;
  x: number;
  y: number;
  type: ItemType;
  name: string;
  value?: number;
  subtype?: string; // e.g. 'fire', 'water', 'earth' for runes
}

export class Collectible {
  public id: string;
  public x: number;
  public y: number;
  public type: ItemType;
  public name: string;
  public value: number;
  public subtype: string;
  public collected = false;

  private width = 16;
  private height = 16;
  private spawnTime: number;

  constructor(def: CollectibleDef) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    this.type = def.type;
    this.name = def.name;
    this.value = def.value ?? 0;
    this.subtype = def.subtype ?? '';
    this.spawnTime = performance.now();
  }

  get centerX(): number { return this.x + this.width / 2; }
  get centerY(): number { return this.y + this.height / 2; }

  /**
   * Check if player overlaps this item
   */
  checkPickup(player: Player): boolean {
    if (this.collected) return false;
    const px = player.x;
    const py = player.y;
    const pw = player.width;
    const ph = player.height;
    return this.x < px + pw && this.x + this.width > px &&
           this.y < py + ph && this.y + this.height > py;
  }

  /**
   * Apply the pickup effect to the player
   */
  pickup(player: Player): string {
    this.collected = true;

    switch (this.type) {
      case 'gold':
        return `+${this.value} Gold`;
      case 'rune':
        player.runes.push(this.subtype || this.name);
        return `Found ${this.name}!`;
      case 'potion':
        if (this.subtype === 'hp') {
          const heal = Math.min(this.value, player.stats.maxHp - player.stats.hp);
          player.stats.hp += heal;
          return `+${heal} HP`;
        } else if (this.subtype === 'mp') {
          const restore = Math.min(this.value, player.stats.maxMp - player.stats.mp);
          player.stats.mp += restore;
          return `+${restore} MP`;
        }
        return `Used ${this.name}`;
      case 'key':
        player.inventory.push(this.name);
        return `Found ${this.name}!`;
      case 'lore':
        return `${this.name}: "${this.subtype}"`;
      default:
        return `Found ${this.name}`;
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    if (this.collected) return;
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y - camY);
    const elapsed = (performance.now() - this.spawnTime) / 1000;
    const bob = Math.sin(elapsed * 2) * 3;

    ctx.save();

    // Glow
    const glowAlpha = 0.2 + 0.1 * Math.sin(elapsed * 3);
    ctx.fillStyle = `rgba(255, 255, 200, ${glowAlpha})`;
    ctx.beginPath();
    ctx.arc(sx + 8, sy + 8 + bob, 12, 0, Math.PI * 2);
    ctx.fill();

    switch (this.type) {
      case 'rune':
        // Glowing rune stone
        const runeColor = this.subtype === 'fire' ? '#ef4444' :
                          this.subtype === 'water' ? '#3b82f6' :
                          this.subtype === 'earth' ? '#22c55e' : '#a855f7';
        ctx.fillStyle = runeColor;
        ctx.beginPath();
        ctx.arc(sx + 8, sy + 8 + bob, 7, 0, Math.PI * 2);
        ctx.fill();
        // Rune symbol
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const symbols: Record<string, string> = { fire: 'ᚠ', water: 'ᚢ', earth: 'ᚦ', air: 'ᚨ' };
        ctx.fillText(symbols[this.subtype] || 'ᛟ', sx + 8, sy + 8 + bob);
        break;

      case 'gold':
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(sx + 8, sy + 8 + bob, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#92400e';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', sx + 8, sy + 8 + bob);
        break;

      case 'potion':
        ctx.fillStyle = this.subtype === 'hp' ? '#ef4444' : '#3b82f6';
        // Bottle shape
        ctx.fillRect(sx + 4, sy + 2 + bob, 8, 3); // cap
        ctx.fillRect(sx + 3, sy + 5 + bob, 10, 10); // body
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.3;
        ctx.fillRect(sx + 5, sy + 7 + bob, 2, 6); // highlight
        ctx.globalAlpha = 1;
        break;

      case 'key':
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(sx + 3, sy + 5 + bob, 10, 3); // shaft
        ctx.beginPath();
        ctx.arc(sx + 4, sy + 6 + bob, 4, 0, Math.PI * 2); // head
        ctx.fill();
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(sx + 4, sy + 6 + bob, 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'lore':
        ctx.fillStyle = '#d4a574';
        ctx.fillRect(sx + 3, sy + 2 + bob, 10, 12);
        ctx.fillStyle = '#8b5c2a';
        ctx.fillRect(sx + 5, sy + 5 + bob, 6, 1);
        ctx.fillRect(sx + 5, sy + 7 + bob, 6, 1);
        ctx.fillRect(sx + 5, sy + 9 + bob, 4, 1);
        break;
    }

    ctx.restore();
  }
}
