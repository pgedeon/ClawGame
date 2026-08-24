/**
 * @clawgame/api - Export Service
 * Packages game projects into standalone HTML exports with embedded assets.
 *
 * The export runtime uses the same simulation rules as the web preview
 * (useGamePreview), ensuring "Export runtime = preview runtime" (M12).
 */

import { readFile, writeFile, mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { FastifyLoggerInstance } from 'fastify';
import { ProjectService } from './projectService';
import { AssetService } from './assetService';
import { generateGameHTML } from './export-templates';
import { normalizePreviewScene, type SerializableEntity } from '@clawgame/engine';

interface ExportComponent {
  assetRef?: string;
  /** @legacy field written by very old editors; kept only as a read fallback */
  assetId?: string;
  /** Spritesheet frame slicing — mirrors PhaserPreviewAsset.frameData. */
  frameData?: { frameWidth?: number; frameHeight?: number; endFrame?: number };
  /** Atlas metadata — mirrors PhaserPreviewAsset.atlasMeta. */
  atlasMeta?: { atlasUrl?: string; type?: string };
  color?: string;
  content?: string;
  fontSize?: string | number;
  fontFamily?: string;
  type?: string;
  width?: number;
  height?: number;
  offsetX?: number;
  offsetY?: number;
  immovable?: boolean;
  bounce?: number;
  drag?: number;
  allowGravity?: boolean;
  sensor?: boolean;
  velocityX?: number;
  velocityY?: number;
  [key: string]: unknown;
}

interface ExportEntity {
  id?: string;
  name?: string;
  type?: string;
  transform?: {
    x?: number; y?: number; rotation?: number;
    scaleX?: number; scaleY?: number;
    width?: number; height?: number;
  };
  components: Map<string, ExportComponent> | Record<string, ExportComponent>;
}

interface ExportAsset {
  id: string;
  name?: string;
  type?: string;
  url?: string;
  dataUri?: string;
  mimeType?: string;
  size?: number;
  tags?: string[];
}

/** Load kind resolved per referenced sprite asset — mirrors buildAssetRecord precedence (atlas > spritesheet > image). */
interface ExportSpriteLoad {
  ref: string;
  kind: 'image' | 'spritesheet' | 'atlas';
  frameData?: { frameWidth: number; frameHeight: number; endFrame?: number };
  atlasMeta?: { atlasUrl: string; type: 'json' | 'xml' };
}

interface ScenePhysicsConfig {
  gravity?: { x?: number; y?: number };
  debug?: boolean;
}

interface SceneMetadata {
  backgroundColor?: string;
}

/**
 * Bootstrap-equivalent world configuration resolved from raw scene JSON
 * (docs/export-parity.md gap 4). Mirrors what buildPhaserPreviewBootstrap /
 * buildPhaserGameConfig derive from `scene.bounds` + `scene.physics`.
 */
export interface ExportWorldConfig {
  bounds: { x: number; y: number; width: number; height: number };
  gravity?: { x: number; y: number };
  debug?: boolean;
}

interface SceneData {
  name?: string;
  entities?: ExportEntity[] | Record<string, ExportEntity>;
  metadata?: SceneMetadata;
  bounds?: { x?: number; y?: number; width?: number; height?: number };
  physics?: ScenePhysicsConfig;
}

/** Body kinds emitted by compileSceneToPhaser — mirrors PhaserPreviewBodyConfig semantics. */
type ExportBodyKind = 'static' | 'dynamic' | 'sensor' | 'none';

interface ResolvedBody {
  kind: ExportBodyKind;
  width: number;
  height: number;
}

interface SceneData {
  name?: string;
  entities?: ExportEntity[] | Record<string, ExportEntity>;
  metadata?: SceneMetadata;
}

/** Editor shape primitives rendered by dedicated compile branches but outside the engine EntityType union. */
const EXPORT_SHAPE_TYPES = new Set(['text', 'zone', 'circle', 'rectangle']);

/** Mirror of buildPreviewBootstrap DEFAULT_BOUNDS — preview game/world size default. */
const PREVIEW_DEFAULT_BOUNDS = { width: 1280, height: 720 };

/**
 * Bootstrap-equivalent world resolution (docs/export-parity.md gap 4):
 * game dimensions + physics world bounds come from `scene.bounds` exactly like
 * buildPhaserPreviewBootstrap (default 1280×720), arcade gravity/debug come from
 * `scene.physics` exactly like buildPhaserGameConfig.
 */
export function resolveExportWorld(scene: SceneData): ExportWorldConfig {
  const b = scene.bounds;
  const gravityIn = scene.physics?.gravity;
  return {
    bounds: {
      x: typeof b?.x === 'number' ? b.x : 0,
      y: typeof b?.y === 'number' ? b.y : 0,
      width: typeof b?.width === 'number' ? b.width : PREVIEW_DEFAULT_BOUNDS.width,
      height: typeof b?.height === 'number' ? b.height : PREVIEW_DEFAULT_BOUNDS.height,
    },
    ...(gravityIn && (typeof gravityIn.x === 'number' || typeof gravityIn.y === 'number')
      ? {
          gravity: {
            x: typeof gravityIn.x === 'number' ? gravityIn.x : 0,
            y: typeof gravityIn.y === 'number' ? gravityIn.y : 0,
          },
        }
      : {}),
    debug: scene.physics?.debug === true,
  };
}

export type PreparedExportEntity = Omit<SerializableEntity, 'type'> & { type?: string };

/**
 * Normalize raw project/template JSON through the shared preview normalizer so
 * per-entity runtime types are inferred on export exactly like in the web
 * preview (docs/export-parity.md gap 1). Export-only shape types ('text',
 * 'zone', 'circle', 'rectangle') are preserved verbatim instead of being
 * collapsed by inference.
 */
export function prepareExportEntities(sceneData: SceneData): PreparedExportEntity[] {
  const normalized = normalizePreviewScene(sceneData);
  const rawEntities = Array.isArray(sceneData.entities)
    ? sceneData.entities
    : Object.values(sceneData.entities || {});
  return normalized.entities.map((entity, i) => {
    const rawType = (rawEntities[i] as { type?: unknown } | undefined)?.type;
    return typeof rawType === 'string' && EXPORT_SHAPE_TYPES.has(rawType)
      ? { ...entity, type: rawType }
      : entity;
  });
}
export interface ExportOptions {
  includeAssets?: boolean;
  minify?: boolean;
  compress?: boolean;
  format?: 'html' | 'zip' | 'phaser-html';
}

export interface ExportResult {
  projectId: string;
  projectName: string;
  version: string;
  format: 'html' | 'zip' | 'phaser-html';
  size: number;
  filename: string;
  downloadUrl: string;
  createdAt: string;
  includesAssets: boolean;
  assetCount: number;
}

/** Metadata stored alongside each export for reliable listing */
interface ExportMetadata {
  projectId: string;
  projectName: string;
  version: string;
  createdAt: string;
  includesAssets: boolean;
  assetCount: number;
}

const EXPORTS_DIR = process.env.EXPORTS_DIR || './data/exports';

/**
 * Body sizing mirror of buildPreviewBootstrap getEntityDimensions.
 * Entities arrive pre-normalized via prepareExportEntities (shared engine
 * normalizer), so `entity.type` is already the runtime-inferred type — read
 * it directly instead of re-inferring from components (single source of truth).
 */
function getExportEntityDimensions(
  sprite: ExportComponent | undefined,
  collision: ExportComponent | undefined,
  transform: ExportEntity['transform'],
): { width: number; height: number } {
  const width = sprite?.width ?? collision?.width ?? transform?.width ?? 32;
  const height = sprite?.height ?? collision?.height ?? transform?.height ?? 32;
  return {
    width: typeof width === 'number' ? width : 32,
    height: typeof height === 'number' ? height : 32,
  };
}

/**
 * Body-kind resolution mirroring buildPreviewBootstrap buildBodyConfig:
 * boolean flags override, then collision.type, then normalized entity type.
 * solid→static, trigger/sensor→sensor, player/enemy/projectile→dynamic, else none.
 */
function resolveExportBody(entity: ExportEntity, components: Map<string, ExportComponent>): ResolvedBody {
  const sprite = components.get('sprite');
  const collision = components.get('collision');
  const { width, height } = getExportEntityDimensions(sprite, collision, entity.transform);

  if (!collision || typeof collision !== 'object') {
    return { kind: 'none', width, height };
  }

  // Respect boolean flags as overrides
  if (collision.solid === true) return { kind: 'static', width, height };
  if (collision.trigger === true) return { kind: 'sensor', width, height };

  const colType = collision.type;
  if (colType === 'solid') return { kind: 'static', width, height };
  if (colType === 'trigger' || colType === 'sensor') return { kind: 'sensor', width, height };

  const entityType = typeof entity.type === 'string' ? entity.type : 'unknown';
  if (entityType === 'player' || entityType === 'enemy' || entityType === 'projectile') {
    return { kind: 'dynamic', width, height };
  }

  return { kind: 'none', width, height };
}

/**
 * Typed colors for color-only entities — mirrors ClawgamePhaserScene.getColorForType
 * (entity representation parity, docs/export-parity.md matrix row 2).
 */
const EXPORT_TYPE_COLORS: Record<string, string> = {
  player: '#3b82f6',
  enemy: '#ef4444',
  collectible: '#f59e0b',
  obstacle: '#64748b',
  npc: '#22c55e',
  tower: '#d2691e',
  projectile: '#ffff00',
  core: '#22c55e',
};

function safeIdentifier(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Unified texture-key convention (docs/export-parity.md gap 2): both pipelines key
 * assets `asset:${ref}` via buildAssetKey. Exported games are standalone single-file
 * HTML — every texture is an embedded data URI registered under our chosen key, so the
 * prefix costs nothing and keeps editor preview + export interchangeable.
 */
function exportTextureKey(ref: string): string {
  return `asset:${ref}`;
}

/** frameData validation mirrors buildAssetRecord: both dimensions must be numbers. */
function normalizeExportFrameData(
  frameData: ExportComponent['frameData'],
): ExportSpriteLoad['frameData'] {
  return frameData &&
    typeof frameData.frameWidth === 'number' &&
    typeof frameData.frameHeight === 'number'
    ? {
        frameWidth: frameData.frameWidth,
        frameHeight: frameData.frameHeight,
        ...(typeof frameData.endFrame === 'number' ? { endFrame: frameData.endFrame } : {}),
      }
    : undefined;
}

/** atlasMeta validation mirrors buildAssetRecord: atlasUrl string + json|xml type. */
function normalizeExportAtlasMeta(
  atlasMeta: ExportComponent['atlasMeta'],
): ExportSpriteLoad['atlasMeta'] {
  return atlasMeta &&
    typeof atlasMeta.atlasUrl === 'string' &&
    (atlasMeta.type === 'json' || atlasMeta.type === 'xml')
    ? { atlasUrl: atlasMeta.atlasUrl, type: atlasMeta.type }
    : undefined;
}

function getComponents(entity: ExportEntity): Map<string, ExportComponent> {
  return entity.components instanceof Map
    ? entity.components
    : new Map(Object.entries(entity.components || {}));
}

/** Collect one load descriptor per referenced sprite asset ref (first entity wins). */
function collectExportLoads(entities: Record<string, ExportEntity>): Map<string, ExportSpriteLoad> {
  const loads = new Map<string, ExportSpriteLoad>();
  for (const entity of Object.values(entities)) {
    const comps = getComponents(entity);
    const sprite = comps.get('sprite');
    const ref = sprite?.assetRef ?? sprite?.assetId;
    if (!ref) continue;
    const key = String(ref);
    if (loads.has(key)) continue;
    const frameData = normalizeExportFrameData(sprite?.frameData);
    const atlasMeta = normalizeExportAtlasMeta(sprite?.atlasMeta);
    loads.set(key, {
      ref: key,
      kind: atlasMeta ? 'atlas' : frameData ? 'spritesheet' : 'image',
      ...(frameData ? { frameData } : {}),
      ...(atlasMeta ? { atlasMeta } : {}),
    });
  }
  return loads;
}

/** Embedded data URI const when the referenced asset was embedded; else legacy file-path fallback. */
function resolveExportSource(ref: string, assets?: ExportAsset[]): string {
  const embedded = assets?.find((a) => a.id === ref);
  if (embedded?.dataUri) return safeIdentifier(ref);
  return `'assets/${ref}.png'`;
}

/**
 * Atlas document source: embedded asset matched by url or raw id, else pass through
 * verbatim (data:/remote URLs), matching how the preview loader consumes atlasUrl.
 */
function resolveExportAtlasSource(atlasUrl: string, assets?: ExportAsset[]): string {
  const embedded = assets?.find((a) => a.url === atlasUrl || a.id === atlasUrl);
  if (embedded?.dataUri) return safeIdentifier(embedded.id);
  return `'${String(atlasUrl).replace(/'/g, "\\'")}'`;
}

export class ExportService {
  private logger: FastifyLoggerInstance;
  private projectService: ProjectService;
  private assetService: AssetService;

  constructor(logger: FastifyLoggerInstance) {
    this.logger = logger;
    this.projectService = new ProjectService(logger);
    this.assetService = new AssetService(logger);
  }

  /**
   * Ensure exports directory exists
   */
  private async ensureExportsDir(): Promise<string> {
    if (!existsSync(EXPORTS_DIR)) {
      await mkdir(EXPORTS_DIR, { recursive: true });
    }
    return EXPORTS_DIR;
  }

  /**
   * Export project as standalone Phaser 4 HTML.
   */
  async exportToPhaserHTML(projectId: string, options: ExportOptions = {}): Promise<ExportResult> {
    const exportsDir = await this.ensureExportsDir();
    const project = await this.projectService.getProjectDetail(projectId);
    if (!project) throw new Error('Project not found');

    let sceneData: SceneData | null = null;
    const scenePath = join('./data/projects', projectId, 'scenes/main-scene.json');
    try {
      if (existsSync(scenePath)) sceneData = JSON.parse(await readFile(scenePath, 'utf-8'));
    } catch { sceneData = { name: 'Main Scene', entities: [] }; }
    if (!sceneData) sceneData = { name: 'Main Scene', entities: [] };

    // Parity gap 1: run raw project/template JSON through the same normalizer as
    // the web preview so inferred runtime types drive per-type behavior branches.
    const entityMap: Record<string, any> = {};
    for (const e of prepareExportEntities(sceneData)) {
      entityMap[e.id || `e-${Object.keys(entityMap).length}`] = {
        ...e,
        components: e.components instanceof Map
          ? e.components
          : new Map(Object.entries(e.components || {})),
      };
    }

    const className = (sceneData.name || 'Main').replace(/[^a-zA-Z0-9]/g, '') + 'Scene';

    let assetData: ExportAsset[] = [];
    if (options.includeAssets !== false) assetData = await this.embedAssets(projectId);

    // Assets must be resolved before compiling so preload can reference embedded data URIs.
    // World config is resolved from the same scene fields the preview bootstrap reads (gap 4).
    const world = resolveExportWorld(sceneData);
    const sceneCode = this.compileSceneToPhaser(className, sceneData.name || 'Main Scene', entityMap, assetData, sceneData.metadata, world);

    const html = this.generatePhaserHTML(project, className, sceneCode, assetData, sceneData.metadata, world);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = project.name.replace(/[^a-zA-Z0-9-]/g, '-');
    const filename = `${projectId}-${safeName}-phaser-${timestamp}.html`;
    const filePath = join(exportsDir, filename);
    await writeFile(filePath, html, 'utf-8');

    const metadata: ExportMetadata = {
      projectId, projectName: project.name, version: project.version || '1.0.0',
      createdAt: new Date().toISOString(), includesAssets: options.includeAssets !== false, assetCount: assetData.length,
    };
    await writeFile(join(exportsDir, `${filename}.meta.json`), JSON.stringify(metadata, null, 2), 'utf-8');

    return {
      projectId, projectName: project.name, version: project.version || '1.0.0',
      format: 'phaser-html', size: Buffer.byteLength(html, 'utf-8'), filename,
      downloadUrl: `/api/projects/${projectId}/exports/${filename}`,
      createdAt: metadata.createdAt, includesAssets: options.includeAssets !== false, assetCount: assetData.length,
    };
  }

  compileSceneToPhaser(className: string, sceneName: string, entities: Record<string, ExportEntity>, assets?: ExportAsset[], metadata?: SceneMetadata, world?: ExportWorldConfig): string {
    const lines: string[] = [];
    const indent = '    ';
    // Preload every referenced sprite asset with the unified `asset:` texture key.
    // Kind precedence mirrors buildAssetRecord / ClawgamePhaserScene.preload:
    // atlasMeta → load.atlas|atlasXML, frameData → load.spritesheet, else load.image.
    const loads = collectExportLoads(entities);
    lines.push(`${indent}preload() {`);
    for (const load of loads.values()) {
      const key = exportTextureKey(load.ref);
      if (load.kind === 'atlas') {
        const loader = load.atlasMeta!.type === 'xml' ? 'atlasXML' : 'atlas';
        const atlasSrc = resolveExportAtlasSource(load.atlasMeta!.atlasUrl, assets);
        lines.push(
          `${indent}  this.load.${loader}('${key}', ${resolveExportSource(load.ref, assets)}, ${atlasSrc});`,
        );
      } else if (load.kind === 'spritesheet') {
        const fd = load.frameData!;
        const endFrame = typeof fd.endFrame === 'number' ? `, endFrame: ${fd.endFrame}` : '';
        lines.push(
          `${indent}  this.load.spritesheet('${key}', ${resolveExportSource(load.ref, assets)}, { frameWidth: ${fd.frameWidth}, frameHeight: ${fd.frameHeight}${endFrame} });`,
        );
      } else {
        lines.push(`${indent}  this.load.image('${key}', ${resolveExportSource(load.ref, assets)});`);
      }
    }
    lines.push(`${indent}}`);
    lines.push('');
    lines.push(`${indent}create() {`);
    // Physics world bounds mirror ClawgamePhaserScene.create: setBounds from bootstrap
    // bounds (x/y default 0) before entities are created.
    if (world) {
      lines.push(`${indent}  this.physics.world.setBounds(${world.bounds.x}, ${world.bounds.y}, ${world.bounds.width}, ${world.bounds.height});`);
    }
    lines.push(`${indent}  // Entities`);
    for (const [id, entity] of Object.entries(entities)) {
      const e = entity;
      const x = e.transform?.x ?? 0;
      const y = e.transform?.y ?? 0;
      const name = e.name || id;
      const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      const type = (e.type || 'custom') as string;
      const comps = e.components instanceof Map ? e.components : new Map(Object.entries(e.components || {}));
      const sprite = comps.get('sprite');
      const collision = comps.get('collision');
      if (type === 'text') {
        const text = comps.get('text');
        lines.push(`${indent}  this.add.text(${x}, ${y}, '${text?.content || name}', { fontSize: '${text?.fontSize || 16}px', color: '${text?.color || '#ffffff'}' });`);
      } else if (type === 'zone' || type === 'trigger') {
        lines.push(`${indent}  this.add.zone(${x}, ${y}, ${collision?.width || 64}, ${collision?.height || 64});`);
      } else if (type === 'circle') {
        const r = Math.min(e.transform?.width ?? 32, e.transform?.height ?? 32) / 2;
        lines.push(`${indent}  this.add.circle(${x}, ${y}, ${r}, '${sprite?.color || '#8b5cf6'}');`);
      } else if (type === 'rectangle') {
        lines.push(`${indent}  this.add.rectangle(${x}, ${y}, ${e.transform?.width || 32}, ${e.transform?.height || 32}, '${sprite?.color || '#8b5cf6'}');`);
      } else {
        const assetRef = sprite?.assetRef ?? sprite?.assetId;
        const dims = getExportEntityDimensions(sprite, collision, e.transform);
        if (assetRef) {
          // Asset entities render as textured sprites sized like preview
          // (ClawgamePhaserScene.createEntity: image + setDisplaySize).
          const key = exportTextureKey(String(assetRef));
          lines.push(`${indent}  const ${safeName} = this.add.sprite(${x}, ${y}, '${key}');`);
          lines.push(`${indent}  ${safeName}.setDisplaySize(${dims.width}, ${dims.height});`);
        } else {
          // Color-only entities render as typed-color rectangles like preview
          // (getColorForType) instead of missing-texture sprites.
          const color = EXPORT_TYPE_COLORS[type] || '#8b5cf6';
          lines.push(`${indent}  const ${safeName} = this.add.rectangle(${x}, ${y}, ${dims.width}, ${dims.height}, '${color}');`);
        }
        if (e.transform?.rotation) lines.push(`${indent}  ${safeName}.setRotation(${e.transform.rotation});`);
        if ((e.transform?.scaleX ?? 1) !== 1 || (e.transform?.scaleY ?? 1) !== 1) lines.push(`${indent}  ${safeName}.setScale(${e.transform?.scaleX ?? 1}, ${e.transform?.scaleY ?? 1});`);
        // Body emission mirrors buildPhaserPreviewBootstrap + ClawgamePhaserScene.createEntity:
        // static/dynamic/sensor kinds, body sizing, world-bounds for dynamic only,
        // immovable + no-gravity sensors. No body for collectibles/signs/NPCs/etc.
        const body = resolveExportBody(e, comps);
        if (body.kind !== 'none') {
          lines.push(`${indent}  this.physics.add.existing(${safeName}, ${body.kind === 'static'});`);
          lines.push(`${indent}  ${safeName}.body.setSize(${body.width}, ${body.height});`);
          if (body.kind === 'dynamic') lines.push(`${indent}  ${safeName}.body.setCollideWorldBounds(true);`);
          if (body.kind === 'sensor') {
            lines.push(`${indent}  ${safeName}.body.setImmovable(true);`);
            lines.push(`${indent}  ${safeName}.body.setAllowGravity(false);`);
          }
        }
      }
    }
    lines.push(`${indent}}`);
    return lines.join('\n');
  }

  generatePhaserHTML(project: { name: string; version?: string }, className: string, sceneCode: string, assets: ExportAsset[], metadata?: SceneMetadata, world?: ExportWorldConfig): string {
    // Game dimensions + arcade config mirror buildPhaserGameConfig fed by the preview
    // bootstrap: bounds-derived size (default 1280×720), scene.physics gravity/debug passthrough.
    const w = world?.bounds.width ?? PREVIEW_DEFAULT_BOUNDS.width;
    const h = world?.bounds.height ?? PREVIEW_DEFAULT_BOUNDS.height;
    const gravityPart = world?.gravity ? `, gravity: { x: ${world.gravity.x}, y: ${world.gravity.y} }` : '';
    const debugFlag = world?.debug === true;
    const bg = metadata?.backgroundColor || '#1a1a2e';
    const dataUriAssets = assets.filter((a) => a.dataUri)
      .map((a) => `  const ${a.id.replace(/[^a-zA-Z0-9]/g, '_')} = '${a.dataUri}';`).join('\n');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name}</title>
  <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { background: ${bg}; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }</style>
  <script src="https://cdn.jsdelivr.net/npm/phaser@4.0.0/dist/phaser.min.js"><\/script>
</head>
<body>
  <div id="game-container"></div>
  <script>
${dataUriAssets}
class ${className} extends Phaser.Scene {
  constructor() { super('${className}'); }
${sceneCode}
}
const config = { type: Phaser.AUTO, width: ${w}, height: ${h}, backgroundColor: '${bg}', physics: { default: 'arcade', arcade: { debug: ${debugFlag}${gravityPart} } }, scene: [${className}], parent: 'game-container' };
new Phaser.Game(config);
  <\/script>
</body>
</html>`;
  }

  /**
   * Generate standalone HTML export of a game
   */
  async exportToHTML(projectId: string, options: ExportOptions = {}): Promise<ExportResult> {
    const includeAssets = options.includeAssets !== false;
    const exportsDir = await this.ensureExportsDir();

    this.logger.info({ projectId, includeAssets }, 'Starting HTML export');

    // Load project data
    const project = await this.projectService.getProjectDetail(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Load scene data - use direct file reading for simplicity
    let sceneData: SceneData | null = null;
    const scenePath = join('./data/projects', projectId, 'scenes/main-scene.json');
    try {
      if (existsSync(scenePath)) {
        const sceneContent = await readFile(scenePath, 'utf-8');
        sceneData = JSON.parse(sceneContent);
      }
    } catch (sceneErr) {
      this.logger.warn({ projectId, err: sceneErr }, 'No scene file found, using default scene');
      sceneData = { name: 'Main Scene', entities: [] };
    }

    if (!sceneData) {
      sceneData = { name: 'Main Scene', entities: [] };
    }

    // Load assets if requested
    let assetData: ExportAsset[] = [];
    if (includeAssets) {
      assetData = await this.embedAssets(projectId);
    }

    // Generate HTML
    const html = generateGameHTML(project, sceneData, assetData, includeAssets);

    // Write export file — include projectId in filename for reliable listing
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = project.name.replace(/[^a-zA-Z0-9-]/g, '-');
    const filename = `${projectId}-${safeName}-${timestamp}.html`;
    const filePath = join(exportsDir, filename);

    await writeFile(filePath, html, 'utf-8');

    // Write metadata sidecar for accurate listing
    const metadata: ExportMetadata = {
      projectId,
      projectName: project.name,
      version: project.version || '1.0.0',
      createdAt: new Date().toISOString(),
      includesAssets: includeAssets,
      assetCount: assetData.length,
    };
    const metaPath = join(exportsDir, `${filename}.meta.json`);
    await writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

    const result: ExportResult = {
      projectId,
      projectName: project.name,
      version: project.version || '1.0.0',
      format: 'html',
      size: Buffer.byteLength(html, 'utf-8'),
      filename,
      downloadUrl: `/api/projects/${projectId}/exports/${filename}`,
      createdAt: metadata.createdAt,
      includesAssets: includeAssets,
      assetCount: assetData.length,
    };

    this.logger.info({
      projectId,
      filename,
      size: result.size,
      assetCount: result.assetCount,
    }, 'HTML export completed');

    return result;
  }

  /**
   * Embed assets as data URIs in the export
   */
  private async embedAssets(projectId: string): Promise<any[]> {
    const assets = await this.assetService.listAssets(projectId);
    const embeddedAssets: ExportAsset[] = [];

    for (const asset of assets) {
      try {
        const { content, mimeType } = await this.assetService.getAssetFile(projectId, asset.id);
        const base64 = content.toString('base64');
        const dataUri = `data:${mimeType};base64,${base64}`;

        embeddedAssets.push({
          id: asset.id,
          name: asset.name,
          type: asset.type,
          // Server-relative source path — lets preload resolve atlas documents
          // referenced via atlasMeta.atlasUrl to embedded data URIs.
          url: (asset as { url?: string }).url,
          dataUri,
          mimeType,
          tags: asset.tags || [],
        });
      } catch (err) {
        this.logger.warn({ projectId, assetId: asset.id, err }, 'Failed to embed asset');
      }
    }

    return embeddedAssets;
  }

  /**
   * Generate standalone HTML game file.
   *
   * The inline runtime mirrors the web preview (useGamePreview) so that
   * exported games behave identically to what the creator sees in the
   * editor preview — the core M12 "export runtime = preview runtime" goal.
   */

  /**
   * Get export file
   */
  async getExportFile(filename: string): Promise<{ content: Buffer; mimeType: string }> {
    const filePath = join(EXPORTS_DIR, filename);

    if (!existsSync(filePath)) {
      throw new Error('Export not found');
    }

    const content = await readFile(filePath);
    return {
      content: Buffer.from(content),
      mimeType: 'text/html',
    };
  }

  /**
   * List exports for a project using metadata sidecar files
   */
  async listExports(projectId: string): Promise<ExportResult[]> {
    const exportsDir = await this.ensureExportsDir();
    const files = await readdir(exportsDir);

    const results: ExportResult[] = [];

    for (const file of files) {
      // Only process metadata sidecars for this project
      if (!file.endsWith('.meta.json')) continue;

      // Read metadata to check projectId
      const metaPath = join(exportsDir, file);
      try {
        const metaContent = await readFile(metaPath, 'utf-8');
        const meta: ExportMetadata = JSON.parse(metaContent);

        if (meta.projectId !== projectId) continue;

        // The HTML file is the meta filename without the .meta.json suffix
        const htmlFilename = file.replace(/\.meta\.json$/, '');
        const htmlPath = join(exportsDir, htmlFilename);

        if (!existsSync(htmlPath)) continue;

        const stats = await stat(htmlPath);

        results.push({
          projectId: meta.projectId,
          projectName: meta.projectName,
          version: meta.version,
          format: 'html',
          size: stats.size,
          filename: htmlFilename,
          downloadUrl: `/api/projects/${projectId}/exports/${htmlFilename}`,
          createdAt: meta.createdAt,
          includesAssets: meta.includesAssets,
          assetCount: meta.assetCount,
        });
      } catch (err) {
        this.logger.warn({ file, err }, 'Failed to read export metadata');
      }
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return results;
  }

  /**
   * Delete export file and its metadata sidecar
   */
  async deleteExport(filename: string): Promise<boolean> {
    const filePath = join(EXPORTS_DIR, filename);
    const metaPath = join(EXPORTS_DIR, `${filename}.meta.json`);

    const htmlExists = existsSync(filePath);
    const metaExists = existsSync(metaPath);

    if (!htmlExists && !metaExists) {
      return false;
    }

    if (htmlExists) await unlink(filePath);
    if (metaExists) await unlink(metaPath);

    this.logger.info({ filename }, 'Export deleted');

    return true;
  }
}
