// Top-Down Action Game Script
export function update(deltaTime: number) {
  // Free movement in all directions
  const speed = 250;
  
  if (keys['ArrowUp'] || keys['w']) player.y -= speed * deltaTime;
  if (keys['ArrowDown'] || keys['s']) player.y += speed * deltaTime;
  if (keys['ArrowLeft'] || keys['a']) player.x -= speed * deltaTime;
  if (keys['ArrowRight'] || keys['d']) player.x += speed * deltaTime;
  
  // Clamp to screen bounds
  player.x = Math.max(16, Math.min(784, player.x));
  player.y = Math.max(16, Math.min(584, player.y));
}

export function render(ctx: CanvasRenderingContext2D) {
  // Game rendering handled by scene system
}