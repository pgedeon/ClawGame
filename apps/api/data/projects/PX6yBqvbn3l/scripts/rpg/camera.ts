/**
 * Eclipse of Runes — Camera System
 * Smooth-follow camera with lerp and map boundary clamping.
 */

export class Camera {
  public x: number = 0;
  public y: number = 0;

  private targetX: number = 0;
  private targetY: number = 0;
  private smoothing: number = 0.08; // lerp factor (0=instant, 1=never catch up)

  // Map bounds in pixels
  private boundsX: number = 0;
  private boundsY: number = 0;
  private boundsW: number = Infinity;
  private boundsH: number = Infinity;

  // Viewport dimensions
  private viewportW: number = 800;
  private viewportH: number = 600;

  /**
   * Set the map bounds for camera clamping
   */
  setBounds(x: number, y: number, w: number, h: number): void {
    this.boundsX = x;
    this.boundsY = y;
    this.boundsW = w;
    this.boundsH = h;
  }

  /**
   * Set viewport (canvas) dimensions
   */
  setViewport(w: number, h: number): void {
    this.viewportW = w;
    this.viewportH = h;
  }

  /**
   * Set the lerp smoothing factor
   */
  setSmoothing(s: number): void {
    this.smoothing = Math.max(0, Math.min(1, s));
  }

  /**
   * Tell the camera to follow a position
   */
  follow(x: number, y: number): void {
    // Center camera on target
    this.targetX = x - this.viewportW / 2;
    this.targetY = y - this.viewportH / 2;
  }

  /**
   * Snap camera instantly (no lerp) — useful for teleport/scene load
   */
  snapTo(x: number, y: number): void {
    this.follow(x, y);
    this.x = this.targetX;
    this.y = this.targetY;
    this.clamp();
  }

  /**
   * Update camera position (call each frame)
   */
  update(): void {
    // Lerp toward target
    this.x += (this.targetX - this.x) * this.smoothing;
    this.y += (this.targetY - this.y) * this.smoothing;

    this.clamp();
  }

  /**
   * Clamp camera to map bounds
   */
  private clamp(): void {
    const maxX = this.boundsX + this.boundsW - this.viewportW;
    const maxY = this.boundsY + this.boundsH - this.viewportH;

    this.x = Math.max(this.boundsX, Math.min(this.x, maxX));
    this.y = Math.max(this.boundsY, Math.min(this.y, maxY));
  }
}
