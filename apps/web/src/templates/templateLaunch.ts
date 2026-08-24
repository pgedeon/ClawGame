/**
 * Shared template launcher (onboarding design §3.2).
 *
 * One code path for project creation + template file writing, used by
 * LandingPage one-click launch / prompt bar and CreateProjectPage form
 * (behavior preserved). Extracted verbatim from CreateProjectPage.tsx.
 */
import { api, type CreateProjectInput } from '../api/client';
import { logger } from '../utils/logger';
import { recordRecentProject } from '../utils/recentProjects';
import { getTemplateById, type GameTemplate } from './templateCatalog';

/** Writes the template starter files into an existing project. */
export async function writeTemplateFiles(projectId: string, template: GameTemplate, projectName: string): Promise<void> {
  // Default game script from template
  if (template.defaultScript) {
    await api.writeFile(projectId, 'scripts/game.ts', template.defaultScript);
  }

  // Default player script
  await api.writeFile(
    projectId,
    'scripts/player.ts',
    `// Player controls for ${projectName}
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
}`
  );

  // Default scene from template
  await api.createDirectory(projectId, 'scenes');
  await api.writeFile(projectId, 'scenes/main-scene.json', JSON.stringify(template.defaultScene, null, 2));
}

/**
 * Creates a project and writes the template files. Template file failures do
 * not block project creation (same semantics as the original inline sequence).
 */
export async function createProjectWithTemplate(input: CreateProjectInput, template: GameTemplate | null): Promise<{ id: string }> {
  const projectInput = {
    ...input,
    genre: input.genre || template?.genre || 'action',
  };

  const response = await api.createProject(projectInput);

  if (template) {
    try {
      await writeTemplateFiles(response.id, template, input.name);
      logger.info('Template files added to project', response.id);
    } catch (err) {
      logger.error('Template creation failed:', err);
      // Don't block project creation
    }
  }

  return { id: response.id };
}

// --- Auto-naming (GDevelop-style adjective+noun, design §3.2) ---

const ADJECTIVES = [
  'Bouncing', 'Golden', 'Silent', 'Rusty', 'Cosmic', 'Brave', 'Misty', 'Neon',
  'Frozen', 'Lucky', 'Wild', 'Shiny', 'Hidden', 'Roaring', 'Dancing', 'Ancient',
  'Electric', 'Velvet', 'Crimson', 'Drifting',
];

const NOUNS = [
  'Ember', 'Comet', 'Fox', 'Castle', 'Voyage', 'Spark', 'Harbor', 'Jungle',
  'Pixel', 'Storm', 'Quest', 'Garden', 'Rocket', 'Cavern', 'Meadow', 'Compass',
  'Lantern', 'Summit', 'Whisper', 'Odyssey',
];

/** Deterministic-ish random pick; collision-safe enough for local use. */
function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function generateProjectName(): string {
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
}

// --- Prompt → template matching (deterministic, local; design §3.2) ---

const PROMPT_KEYWORDS: Array<{ templateId: string; keywords: string[] }> = [
  { templateId: 'platformer', keywords: ['jump', 'platform', 'side-scroll', 'sidescroll', 'stomp', 'mario'] },
  { templateId: 'dialogue', keywords: ['talk', 'dialogue', 'dialog', 'npc', 'quest', 'story', 'conversation'] },
];

export function matchPromptToTemplate(prompt: string): string {
  const text = prompt.toLowerCase();
  for (const { templateId, keywords } of PROMPT_KEYWORDS) {
    if (keywords.some((k) => text.includes(k))) return templateId;
  }
  return 'topdown';
}

// --- One-click launch ---

export interface LaunchTemplateOptions {
  /** Free-text prompt stored as project description (prompt bar path). */
  description?: string;
  /** Explicit name override (form path). */
  name?: string;
}

export interface LaunchedTemplate {
  id: string;
  name: string;
  templateId: string;
}

/**
 * Instant auto-named project from a template id: creates the project with
 * catalog defaults, writes the starter files, records it in the recent
 * index, and returns `{ id }` for navigation.
 */
export async function launchTemplate(templateId: string, opts: LaunchTemplateOptions = {}): Promise<LaunchedTemplate> {
  const template = getTemplateById(templateId);
  if (!template) throw new Error(`Unknown template: ${templateId}`);

  const name = opts.name ?? generateProjectName();
  const input: CreateProjectInput = {
    name,
    genre: template.genre,
    artStyle: 'pixel',
    description: opts.description ?? '',
    runtimeTarget: 'browser',
    renderBackend: 'canvas',
  };

  const { id } = await createProjectWithTemplate(input, template);

  recordRecentProject({
    id,
    name,
    templateId: template.id,
    createdAt: new Date().toISOString(),
  });

  return { id, name, templateId: template.id };
}
