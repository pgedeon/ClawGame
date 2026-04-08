// Player controls for Dungeon Crawler
export function update(deltaTime: number) {
  const speed = 200;
  
  if (keys['ArrowLeft'] || keys['a']) entity.vx = -speed;
  else if (keys['ArrowRight'] || keys['d']) entity.vx = speed;
  else entity.vx *= 0.8;
  
  if (keys['ArrowUp'] || keys['w']) entity.vy = -speed;
  else if (keys['ArrowDown'] || keys['s']) entity.vy = speed;
  else entity.vy *= 0.8;
}

export function render(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = entity.color || '#3b82f6';
  ctx.fillRect(-16, -16, 32, 32);
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  ctx.strokeRect(-16, -16, 32, 32);
}