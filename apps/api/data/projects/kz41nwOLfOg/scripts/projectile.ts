export class ProjectileSystem {
  private projectiles: { x: number; y: number; dx: number; speed: number }[] = [];
  private cooldown = 0;
  private fireRate = 0.3;
  private bulletSpeed = 600;

  update(dt: number) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.dx * p.speed * dt;
      if (p.x < -50 || p.x > 850) this.projectiles.splice(i, 1);
    }
  }

  fire(x: number, y: number, direction: number) {
    if (this.cooldown > 0) return;
    this.projectiles.push({ x, y, dx: direction, speed: this.bulletSpeed });
    this.cooldown = this.fireRate;
  }

  getProjectiles() { return this.projectiles; }
}