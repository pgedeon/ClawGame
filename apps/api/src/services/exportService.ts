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

interface ExportComponent {
  assetId?: string;
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

interface SceneMetadata {
  width?: number;
  height?: number;
  backgroundColor?: string;
}

interface SceneData {
  name?: string;
  entities?: ExportEntity[] | Record<string, ExportEntity>;
  metadata?: SceneMetadata;
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

    const entities = Array.isArray(sceneData.entities) ? sceneData.entities : Object.values(sceneData.entities || {});
    const entityMap: Record<string, any> = {};
    for (const e of entities) {
      entityMap[e.id || `e-${Object.keys(entityMap).length}`] = {
        ...e,
        components: e.components instanceof Map
          ? e.components
          : new Map(Object.entries(e.components || {})),
      };
    }

    const className = (sceneData.name || 'Main').replace(/[^a-zA-Z0-9]/g, '') + 'Scene';
    const sceneCode = this.compileSceneToPhaser(className, sceneData.name || 'Main Scene', entityMap, undefined, sceneData.metadata);

    let assetData: ExportAsset[] = [];
    if (options.includeAssets !== false) assetData = await this.embedAssets(projectId);

    const html = this.generatePhaserHTML(project, className, sceneCode, assetData, sceneData.metadata);
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

  compileSceneToPhaser(className: string, sceneName: string, entities: Record<string, ExportEntity>, assets?: ExportAsset[], metadata?: SceneMetadata): string {
    const lines: string[] = [];
    const indent = '    ';
    const assetIds = new Set<string>();
    for (const entity of Object.values(entities)) {
      const comps = entity.components instanceof Map ? entity.components : new Map(Object.entries(entity.components || {}));
      const sprite = comps.get('sprite');
      if (sprite?.assetId) assetIds.add(String(sprite.assetId));
    }
    lines.push(`${indent}preload() {`);
    // Use data URIs for assets if available, otherwise fall back to file paths
    for (const id of assetIds) {
      const embedded = assets?.find((a) => a.id === id);
      if (embedded?.dataUri) {
        lines.push(`${indent}  this.load.image('${id}', ${id.replace(/[^a-zA-Z0-9]/g, '_')});`);
      } else {
        lines.push(`${indent}  this.load.image('${id}', 'assets/${id}.png');`);
      }
    }
    lines.push(`${indent}}`);
    lines.push('');
    lines.push(`${indent}create() {`);
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
        const key = sprite?.assetId || safeName;
        lines.push(`${indent}  const ${safeName} = this.add.sprite(${x}, ${y}, '${key}');`);
        if (e.transform?.rotation) lines.push(`${indent}  ${safeName}.setRotation(${e.transform.rotation});`);
        if ((e.transform?.scaleX ?? 1) !== 1 || (e.transform?.scaleY ?? 1) !== 1) lines.push(`${indent}  ${safeName}.setScale(${e.transform?.scaleX ?? 1}, ${e.transform?.scaleY ?? 1});`);
        if (collision?.type && collision.type !== 'none') {
          const isStatic = collision.type === 'wall' || collision.type === 'solid';
          lines.push(`${indent}  this.physics.add.existing(${safeName}, ${isStatic});`);
        }
      }
    }
    lines.push(`${indent}}`);
    return lines.join('\n');
  }

  generatePhaserHTML(project: { name: string; version?: string }, className: string, sceneCode: string, assets: ExportAsset[], metadata?: SceneMetadata): string {
    const w = metadata?.width || 800;
    const h = metadata?.height || 600;
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
const config = { type: Phaser.AUTO, width: ${w}, height: ${h}, backgroundColor: '${bg}', physics: { default: 'arcade', arcade: { debug: false } }, scene: [${className}], parent: 'game-container' };
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
