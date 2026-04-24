/**
 * @clawgame/engine - Scene Compiler
 * Compiles scene data into readable Phaser 4 TypeScript code.
 */

import type { Scene, Entity } from './types';
import type { AssetPack } from './asset-pack';
import { generatePreloadCode } from './asset-pack';
import { generateAnimationCode } from './animations';

export interface CompilerOptions {
  className: string;
  language: 'typescript' | 'javascript';
  userRegions?: Record<string, string>;
  assetPack?: AssetPack;
  bounds?: { width: number; height: number };
  backgroundColor?: string;
  animationsConfig?: import("./animations").AnimationsConfig;
}

export const USER_CODE_MARKERS = {
  IMPORTS: 'USER_IMPORTS',
  PRELOAD: 'USER_PRELOAD',
  CREATE: 'USER_CREATE',
  UPDATE: 'USER_UPDATE',
  CUSTOM_METHODS: 'USER_CUSTOM_METHODS',
} as const;

export type UserCodeMarker = (typeof USER_CODE_MARKERS)[keyof typeof USER_CODE_MARKERS];

export function extractUserRegions(code: string): Record<string, string> {
  const regions: Record<string, string> = {};
  for (const marker of Object.values(USER_CODE_MARKERS)) {
    const startRe = new RegExp(`\\/\\/ <BEGIN ${marker}>`, 'g');
    const endRe = new RegExp(`\\/\\/ <END ${marker}>`, 'g');
    let match;
    while ((match = startRe.exec(code)) !== null) {
      const afterStart = match.index + match[0].length;
      const endMatch = endRe.exec(code.slice(afterStart));
      if (endMatch) {
        regions[marker] = code.slice(afterStart, afterStart + endMatch.index).trim();
      }
      endRe.lastIndex = 0;
    }
  }
  return regions;
}

function sortedEntities(entities: Map<string, Entity>): Entity[] {
  return Array.from(entities.values()).sort((a, b) => {
    const typeOrder: Record<string, number> = { player: 0, enemy: 1, npc: 2, collectible: 3, obstacle: 4, zone: 5, text: 6 };
    const aType = a.type ?? 'unknown';
    const bType = b.type ?? 'unknown';
    const aOrder = typeOrder[aType] ?? 99;
    const bOrder = typeOrder[bType] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (a.name || a.id).localeCompare(b.name || b.id);
  });
}

function getComp(entity: Entity, key: string): Record<string, any> | undefined {
  if (entity.components instanceof Map) {
    return entity.components.get(key) as Record<string, any> | undefined;
  }
  return undefined;
}

function generateEntityCreate(entity: Entity, indent: string): string[] {
  const lines: string[] = [];
  const safeName = (entity.name || entity.id).replace(/[^a-zA-Z0-9_]/g, '_') || 'entity';
  const x = entity.transform.x ?? 0;
  const y = entity.transform.y ?? 0;

  const entityType = entity.type ?? 'unknown';

  switch (entityType as string) {
    case 'player':
    case 'enemy':
    case 'npc':
    case 'collectible':
    case 'obstacle':
    case 'platform':
    case 'item':
    case 'projectile':
    case 'custom': {
      const sprite = getComp(entity, 'sprite');
      const key = (sprite && typeof sprite === 'object' ? (sprite as any).assetId : undefined) || safeName;
      lines.push(`${indent}// ${entity.name || entity.id} (${entityType})`);
      lines.push(`${indent}const ${safeName} = this.add.sprite(${x}, ${y}, '${key}');`);
      const rot = entity.transform.rotation;
      if (rot) lines.push(`${indent}${safeName}.setRotation(${rot});`);
      if ((entity.transform.scaleX ?? 1) !== 1 || (entity.transform.scaleY ?? 1) !== 1) {
        lines.push(`${indent}${safeName}.setScale(${entity.transform.scaleX ?? 1}, ${entity.transform.scaleY ?? 1});`);
      }
      // Physics body
      const coll = getComp(entity, 'collision');
      if (coll && coll.type && coll.type !== 'none') {
        const isStatic = (coll.immovable ?? (coll.type === 'wall' || coll.type === 'solid'));
        lines.push(`${indent}this.physics.add.existing(${safeName}, ${isStatic});`);
        if (coll.width) lines.push(`${indent}${safeName}.body.setSize(${coll.width}, ${coll.height ?? coll.width});`);
        if (coll.offsetX || coll.offsetY) lines.push(`${indent}${safeName}.body.setOffset(${coll.offsetX ?? 0}, ${coll.offsetY ?? 0});`);
        if (coll.bounce) lines.push(`${indent}${safeName}.body.setBounce(${coll.bounce});`);
        if (coll.immovable) lines.push(`${indent}${safeName}.body.setImmovable(true);`);
        if (coll.allowGravity) lines.push(`${indent}${safeName}.body.setAllowGravity(true);`);
        if (coll.sensor) lines.push(`${indent}${safeName}.body.setAllowGravity(false); // sensor`);
      }
      break;
    }
    case 'text': {
      const text = getComp(entity, 'text');
      const content = (text && typeof text === 'object' ? String((text as any).content ?? '') : '');
      const fontSize = (text && typeof text === 'object' ? String((text as any).fontSize ?? '16px') : '16px');
      const color = (text && typeof text === 'object' ? String((text as any).color ?? '#ffffff') : '#ffffff');
      const font = (text && typeof text === 'object' ? String((text as any).fontFamily ?? '') : '');
      lines.push(`${indent}// ${entity.name || entity.id}`);
      lines.push(`${indent}this.add.text(${x}, ${y}, '${content}', {`);
      lines.push(`${indent}  fontSize: '${fontSize}',`);
      lines.push(`${indent}  color: '${color}',`);
      if (font) lines.push(`${indent}  fontFamily: '${font}',`);
      lines.push(`${indent}});`);
      break;
    }
    case 'zone':
    case 'trigger': {
      const collision = getComp(entity, 'collision');
      const w = (collision && typeof collision === 'object' ? Number((collision as any).width) : 0) || 64;
      const h = (collision && typeof collision === 'object' ? Number((collision as any).height) : 0) || 64;
      lines.push(`${indent}// ${entity.name || entity.id} (zone)`);
      lines.push(`${indent}this.add.zone(${x}, ${y}, ${w}, ${h});`);
      break;
    }
    case 'rectangle': {
      const w = entity.transform.width || 32;
      const h = entity.transform.height || 32;
      const sprite = getComp(entity, 'sprite');
      const color = (sprite && typeof sprite === 'object' ? String((sprite as any).color ?? '#8b5cf6') : '#8b5cf6');
      lines.push(`${indent}// ${entity.name || entity.id} (rectangle)`);
      lines.push(`${indent}this.add.rectangle(${x}, ${y}, ${w}, ${h}, '${color}').setOrigin(0.5);`);
      break;
    }
    case 'circle': {
      const w = entity.transform.width || 32;
      const h = entity.transform.height || 32;
      const radius = Math.min(w, h) / 2;
      const sprite = getComp(entity, 'sprite');
      const color = (sprite && typeof sprite === 'object' ? String((sprite as any).color ?? '#8b5cf6') : '#8b5cf6');
      lines.push(`${indent}// ${entity.name || entity.id} (circle)`);
      lines.push(`${indent}this.add.circle(${x}, ${y}, ${radius}, '${color}');`);
      break;
    }
    case 'container': {
      lines.push(`${indent}// ${entity.name || entity.id} (container)`);
      lines.push(`${indent}const ${safeName}_container = this.add.container(${x}, ${y});`);
      break;
    }
    case 'tilesprite': {
      const w = entity.transform.width || 256;
      const h = entity.transform.height || 256;
      const sprite = getComp(entity, 'sprite');
      const key = (sprite && typeof sprite === 'object' ? String((sprite as any).assetId ?? safeName) : safeName);
      lines.push(`${indent}// ${entity.name || entity.id} (tilesprite)`);
      lines.push(`${indent}this.add.tileSprite(${x}, ${y}, ${w}, ${h}, '${key}');`);
      break;
    }
    default: {
      lines.push(`${indent}// ${entity.name || entity.id} (${entityType})`);
      lines.push(`${indent}this.add.rectangle(${x}, ${y}, 32, 32, 0xffffff);`);
    }
  }

  return lines;
}

export function compileScene(scene: Scene, opts: CompilerOptions): string {
  const { className, language, userRegions = {}, assetPack } = opts;
  const indent = '    ';
  const entities = sortedEntities(scene.entities);

  // Imports
  const imports: string[] = ["import Phaser from 'phaser';"];
  if (userRegions[USER_CODE_MARKERS.IMPORTS]) imports.push(userRegions[USER_CODE_MARKERS.IMPORTS]);

  // Preload
  const preloadLines: string[] = [];
  if (assetPack) {
    preloadLines.push(...generatePreloadCode(assetPack).split('\n'));
  }
  const loadedKeys = new Set<string>();
  for (const entity of entities) {
    const sprite = getComp(entity, 'sprite');
    const key = sprite && typeof sprite === 'object' ? (sprite as any).assetId as string : undefined;
    if (key && !loadedKeys.has(key)) {
      loadedKeys.add(key);
      preloadLines.push(`${indent}this.load.image('${key}', 'assets/${key}.png');`);
    }
  }
  const uniquePreload = [...new Set(preloadLines)];
  if (userRegions[USER_CODE_MARKERS.PRELOAD]) uniquePreload.push(userRegions[USER_CODE_MARKERS.PRELOAD]);

  // Create
  const createLines: string[] = [];
  for (const entity of entities) {
    createLines.push(...generateEntityCreate(entity, indent));
    createLines.push('');
  }
  if (userRegions[USER_CODE_MARKERS.CREATE]) {
    createLines.push(`${indent}// <BEGIN ${USER_CODE_MARKERS.CREATE}>`);
    createLines.push(userRegions[USER_CODE_MARKERS.CREATE]);
    createLines.push(`${indent}// <END ${USER_CODE_MARKERS.CREATE}>`);
  }

  const lines: string[] = [];
  lines.push(...imports);
  lines.push('');
  lines.push(`export class ${className} extends Phaser.Scene {`);
  lines.push('');
  lines.push(`${indent}constructor() {`);
  lines.push(`${indent}  super('${className}');`);
  lines.push(`${indent}}`);
  lines.push('');
  lines.push(`${indent}preload() {`);
  if (uniquePreload.length > 0) {
    lines.push(...uniquePreload);
  } else {
    lines.push(`${indent}  // No assets to preload`);
  }
  lines.push(`${indent}}`);
  lines.push('');
  lines.push(`${indent}create() {`);
  if (createLines.length > 0) {
    lines.push(...createLines);
  } else {
    lines.push(`${indent}  // Scene is empty`);
  }
  // Animations
  if (opts.animationsConfig && opts.animationsConfig.animations.length > 0) {
    lines.push('');
    lines.push(`${indent}// Animations`);
    lines.push(...generateAnimationCode(opts.animationsConfig).split('\n'));
  }
  lines.push(`${indent}}`);

  if (userRegions[USER_CODE_MARKERS.UPDATE]) {
    lines.push('');
    lines.push(`${indent}update(_time: number, _delta: number) {`);
    lines.push(`${indent}  // <BEGIN ${USER_CODE_MARKERS.UPDATE}>`);
    lines.push(`${indent}  ${userRegions[USER_CODE_MARKERS.UPDATE]}`);
    lines.push(`${indent}  // <END ${USER_CODE_MARKERS.UPDATE}>`);
    lines.push(`${indent}}`);
  }

  if (userRegions[USER_CODE_MARKERS.CUSTOM_METHODS]) {
    lines.push('');
    lines.push(`${indent}// <BEGIN ${USER_CODE_MARKERS.CUSTOM_METHODS}>`);
    lines.push(userRegions[USER_CODE_MARKERS.CUSTOM_METHODS]);
    lines.push(`${indent}// <END ${USER_CODE_MARKERS.CUSTOM_METHODS}>`);
  }

  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

export function compileBootstrapHTML(sceneClassName: string, opts: {
  width?: number;
  height?: number;
  backgroundColor?: string;
  animationsConfig?: import("./animations").AnimationsConfig;
  phaserVersion?: string;
}): string {
  const w = opts.width ?? 800;
  const h = opts.height ?? 600;
  const bg = opts.backgroundColor ?? '#0f172a';
  const phaser = opts.phaserVersion ?? '4';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClawGame Export</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    canvas { border: 1px solid #333; }
  </style>
</head>
<body>
  <script src="https://cdn.jsdelivr.net/npm/phaser@${phaser}/dist/phaser.min.js"></script>
  <script src="scene.js"></script>
  <script>
    const config = {
      type: Phaser.AUTO,
      width: ${w},
      height: ${h},
      backgroundColor: '${bg}',
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
      },
      scene: [${sceneClassName}]
    };
    new Phaser.Game(config);
  </script>
</body>
</html>`;
}
