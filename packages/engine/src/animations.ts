/**
 * @clawgame/engine - Animation types and utilities
 */

export interface AnimationFrame {
  key: string;        // texture/frame key
  duration?: number;  // ms per frame
}

export interface AnimationDefinition {
  key: string;            // animation key
  frames: AnimationFrame[];
  frameRate: number;      // fps
  repeat: number;         // -1 = infinite
  yoyo: boolean;
  delay: number;          // ms before starting
  showOnStart: boolean;
  hideOnComplete: boolean;
  timeScale: number;
}

export interface AnimationsConfig {
  version: 1;
  animations: AnimationDefinition[];
}

export function createDefaultAnimationsConfig(): AnimationsConfig {
  return { version: 1, animations: [] };
}

export function createAnimation(key: string, frames: string[], opts?: Partial<AnimationDefinition>): AnimationDefinition {
  return {
    key,
    frames: frames.map((f) => ({ key: f })),
    frameRate: opts?.frameRate ?? 12,
    repeat: opts?.repeat ?? -1,
    yoyo: opts?.yoyo ?? false,
    delay: opts?.delay ?? 0,
    showOnStart: opts?.showOnStart ?? false,
    hideOnComplete: opts?.hideOnComplete ?? false,
    timeScale: opts?.timeScale ?? 1,
  };
}

export function serializeAnimationsConfig(config: AnimationsConfig): string {
  return JSON.stringify(config, null, 2);
}

export function parseAnimationsConfig(json: string): AnimationsConfig {
  const parsed = JSON.parse(json) as AnimationsConfig;
  if (parsed.version !== 1) throw new Error(`Unsupported animations config version: ${parsed.version}`);
  return parsed;
}

export function addAnimation(config: AnimationsConfig, anim: AnimationDefinition): AnimationsConfig {
  return { ...config, animations: [...config.animations, anim] };
}

export function removeAnimation(config: AnimationsConfig, key: string): AnimationsConfig {
  return { ...config, animations: config.animations.filter((a) => a.key !== key) };
}

export function updateAnimation(config: AnimationsConfig, key: string, patch: Partial<AnimationDefinition>): AnimationsConfig {
  return {
    ...config,
    animations: config.animations.map((a) => (a.key === key ? { ...a, ...patch } : a)),
  };
}

/** Generate Phaser animation creation code */
export function generateAnimationCode(config: AnimationsConfig): string {
  return config.animations
    .map((anim) => {
      const framesStr = anim.frames.map((f) => `{ key: '${f.key}' }`).join(', ');
      return `    this.anims.create({
      key: '${anim.key}',
      frames: [${framesStr}],
      frameRate: ${anim.frameRate},
      repeat: ${anim.repeat},
      yoyo: ${anim.yoyo},
      delay: ${anim.delay},
      showOnStart: ${anim.showOnStart},
      hideOnComplete: ${anim.hideOnComplete},
      timeScale: ${anim.timeScale},
    });`;
    })
    .join('\n');
}
