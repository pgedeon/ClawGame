// Platformer Game Script
export function update(deltaTime: number) {
  // Handle player input
  if (keys['ArrowLeft'] || keys['a']) player.vx = -200;
  else if (keys['ArrowRight'] || keys['d']) player.vx = 200;
  else player.vx *= 0.9;
  
  if ((keys['ArrowUp'] || keys['w'] || keys[' ']) && player.onGround) {
    player.vy = -400;
  }
  
  // Apply gravity
  player.vy += 800 * deltaTime;
}

export function render(ctx: CanvasRenderingContext2D) {
  // Game rendering handled by scene system
}