import { mkdir, readFile, writeFile, readdir, stat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  type ClawGameProject,
  type CreateProjectRequest,
  type ProjectListItem,
  type ProjectDetail,
  type UpdateProjectRequest,
  createDefaultProject,
  createId,
} from '@clawgame/shared';

const PROJECTS_DIR = join(process.cwd(), 'data', 'projects');
const PROJECT_FILE = 'clawgame.project.json';

async function ensureProjectsDir() {
  await mkdir(PROJECTS_DIR, { recursive: true });
}

function projectDir(projectId: string) {
  return join(PROJECTS_DIR, projectId);
}

function projectFilePath(projectId: string) {
  return join(projectDir(projectId), PROJECT_FILE);
}

export async function listProjects(): Promise<ProjectListItem[]> {
  await ensureProjectsDir();
  const entries = await readdir(PROJECTS_DIR);
  const items: ProjectListItem[] = [];

  for (const entry of entries) {
    const dirPath = join(PROJECTS_DIR, entry);
    const s = await stat(dirPath);
    if (!s.isDirectory()) continue;

    try {
      const raw = await readFile(join(dirPath, PROJECT_FILE), 'utf-8');
      const project: ClawGameProject = JSON.parse(raw);
      items.push({
        id: entry,
        name: project.name,
        genre: project.project.genre,
        artStyle: project.project.artStyle,
        description: project.project.description,
        status: 'draft',
        createdAt: s.birthtime.toISOString(),
        updatedAt: s.mtime.toISOString(),
      });
    } catch {
      // skip broken project dirs
    }
  }

  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(projectId: string): Promise<ProjectDetail | null> {
  const filePath = projectFilePath(projectId);
  try {
    const raw = await readFile(filePath, 'utf-8');
    const project: ClawGameProject = JSON.parse(raw);
    const dirStat = await stat(projectDir(projectId));

    // Count scenes
    let sceneCount = 0;
    let entityCount = 0;
    try {
      const scenesDir = join(projectDir(projectId), 'scenes');
      const sceneFiles = await readdir(scenesDir);
      sceneCount = sceneFiles.filter(f => f.endsWith('.json')).length;
    } catch {
      // no scenes dir yet
    }

    return {
      id: projectId,
      name: project.name,
      genre: project.project.genre,
      artStyle: project.project.artStyle,
      description: project.project.description,
      status: 'draft',
      createdAt: dirStat.birthtime.toISOString(),
      updatedAt: dirStat.mtime.toISOString(),
      version: project.version,
      engine: project.engine,
      ai: project.ai,
      assets: project.assets,
      openclaw: project.openclaw,
      sceneCount,
      entityCount,
    };
  } catch {
    return null;
  }
}

export async function createProject(input: CreateProjectRequest): Promise<{ id: string; project: ClawGameProject }> {
  await ensureProjectsDir();
  const id = createId();
  const dir = projectDir(id);
  await mkdir(dir, { recursive: true });

  // Create standard subdirectories
  await mkdir(join(dir, 'scenes'), { recursive: true });
  await mkdir(join(dir, 'assets', 'sprites'), { recursive: true });
  await mkdir(join(dir, 'assets', 'tilesets'), { recursive: true });
  await mkdir(join(dir, 'assets', 'textures'), { recursive: true });
  await mkdir(join(dir, 'assets', 'icons'), { recursive: true });
  await mkdir(join(dir, 'assets', 'audio'), { recursive: true });
  await mkdir(join(dir, 'scripts'), { recursive: true });
  await mkdir(join(dir, 'docs'), { recursive: true });

  const project = createDefaultProject(input);
  await writeFile(projectFilePath(id), JSON.stringify(project, null, 2), 'utf-8');

  return { id, project };
}

export async function updateProject(projectId: string, input: UpdateProjectRequest): Promise<ClawGameProject | null> {
  const filePath = projectFilePath(projectId);
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }

  const project: ClawGameProject = JSON.parse(raw);

  if (input.name !== undefined) {
    project.name = input.name;
    project.project.displayName = input.name;
  }
  if (input.genre !== undefined) project.project.genre = input.genre;
  if (input.artStyle !== undefined) project.project.artStyle = input.artStyle;
  if (input.description !== undefined) project.project.description = input.description;

  await writeFile(filePath, JSON.stringify(project, null, 2), 'utf-8');
  return project;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const dir = projectDir(projectId);
  try {
    const s = await stat(dir);
    if (!s.isDirectory()) return false;
    await rm(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}
