/**
 * Eclipse of Runes — Dialogue System
 * Trigger zones + floating dialogue boxes.
 * Phase 1: sign posts, NPC greetings, proximity-triggered text.
 */

export interface DialogueDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lines: string[];
  trigger: 'proximity' | 'interact'; // proximity = walk near, interact = press key
  once?: boolean; // only trigger once?
  speaker?: string; // NPC name shown in box
}

export class DialogueTrigger {
  public id: string;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public lines: string[];
  public trigger: 'proximity' | 'interact';
  public once: boolean;
  public speaker: string;

  public triggered = false;
  public active = false;
  private currentLine = 0;
  private charIndex = 0;
  private charTimer = 0;
  private charSpeed = 0.03; // seconds per character (typewriter)

  constructor(def: DialogueDef) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    this.width = def.width;
    this.height = def.height;
    this.lines = def.lines;
    this.trigger = def.trigger;
    this.once = def.once ?? true;
    this.speaker = def.speaker ?? '';
  }

  /**
   * Check if a point is inside the trigger zone
   */
  containsPoint(px: number, py: number): boolean {
    return px >= this.x && px <= this.x + this.width &&
           py >= this.y && py <= this.y + this.height;
  }

  /**
   * Activate this dialogue
   */
  activate(): void {
    if (this.triggered && this.once) return;
    this.active = true;
    this.triggered = true;
    this.currentLine = 0;
    this.charIndex = 0;
    this.charTimer = 0;
  }

  /**
   * Advance to next line or close
   */
  advance(): boolean {
    if (!this.active) return false;

    const line = this.lines[this.currentLine];
    // If still typing, complete the line
    if (this.charIndex < line.length) {
      this.charIndex = line.length;
      return true;
    }

    this.currentLine++;
    if (this.currentLine >= this.lines.length) {
      this.active = false;
      return false; // dialogue ended
    }
    this.charIndex = 0;
    this.charTimer = 0;
    return true;
  }

  /**
   * Update typewriter effect
   */
  update(dt: number): void {
    if (!this.active) return;
    const line = this.lines[this.currentLine];
    if (this.charIndex < line.length) {
      this.charTimer += dt;
      while (this.charTimer >= this.charSpeed && this.charIndex < line.length) {
        this.charTimer -= this.charSpeed;
        this.charIndex++;
      }
    }
  }

  /**
   * Render the dialogue box
   */
  render(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number): void {
    if (!this.active) return;
    const line = this.lines[this.currentLine];
    const text = line.substring(0, this.charIndex);

    const boxW = Math.min(canvasW - 40, 500);
    const boxH = this.speaker ? 80 : 64;
    const boxX = (canvasW - boxW) / 2;
    const boxY = canvasH - boxH - 20;

    ctx.save();

    // Background
    ctx.fillStyle = 'rgba(10, 10, 30, 0.92)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.stroke();

    // Speaker name
    let textY = boxY + 16;
    if (this.speaker) {
      ctx.fillStyle = '#60a5fa';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(this.speaker, boxX + 16, textY);
      textY += 18;
    }

    // Dialogue text
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '13px monospace';
    this.wrapText(ctx, text, boxX + 16, textY, boxW - 32, 18);

    // Advance hint
    if (this.charIndex >= line.length) {
      const blink = Math.sin(performance.now() / 300) > 0;
      if (blink) {
        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        const hint = this.currentLine < this.lines.length - 1 ? '▼ Enter/Space' : '▼ Close';
        ctx.fillText(hint, boxX + boxW - 100, boxY + boxH - 10);
      }
    }

    ctx.restore();
  }

  /**
   * Render a small indicator above the trigger zone (e.g. for signs)
   */
  renderIndicator(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    if (this.active) return;
    const sx = this.x + this.width / 2 - camX;
    const sy = this.y - camY - 8;
    const bob = Math.sin(performance.now() / 400) * 3;

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💬', sx, sy + bob);
    ctx.textAlign = 'left';
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number): void {
    const words = text.split(' ');
    let line = '';
    let cy = y;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(line.trim(), x, cy);
        line = word + ' ';
        cy += lineH;
      } else {
        line = test;
      }
    }
    ctx.fillText(line.trim(), x, cy);
  }
}
