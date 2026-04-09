import { readFile, writeFile, readdir, stat, mkdir, rm, unlink } from 'node:fs/promises';
import { join, resolve, relative, extname, basename, dirname } from 'node:path';

const PROJECTS_DIR = join(process.cwd(), 'data', 'projects');

// Allowed extensions for safety — prevent reading arbitrary files
const ALLOWED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html',
  '.md', '.txt', '.yaml', '.yml', '.glsl', '.frag', '.vert',
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg',
  '.mp3', '.wav', '.ogg',
  '.scene.json', // our scene format
]);

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', '.cache']);
const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db']);

export interface FileNode {
  name: string;
  path: string;       // relative path from project root
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  modifiedAt?: string;
  extension?: string;
}

export interface FileContent {
  path: string;
  content: string;
  encoding: 'utf-8' | 'base64';
  size: number;
  modifiedAt: string;
}

export interface FileWriteResult {
  path: string;
  size: number;
  created: boolean;
}

export interface DiffEntry {
  type: 'added' | 'modified' | 'deleted';
  path: string;
  oldContent?: string;
  newContent?: string;
  summary?: string;
}

function isTextFile(ext: string): boolean {
  return ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html', '.md', '.txt', '.yaml', '.yml', '.glsl', '.frag', '.vert', '.svg'].includes(ext);
}

function isAllowedPath(projectId: string, filePath: string): boolean {
  const projectDir = resolve(PROJECTS_DIR, projectId);
  const resolved = resolve(projectDir, filePath);
  // Ensure the resolved path is within the project directory (resolve-safe)
  const rel = relative(projectDir, resolved);
  return !rel.startsWith('..') && !resolve(rel).startsWith('..');
}

export async function getFileTree(projectId: string, subPath: string = '', depth: number = 0, maxDepth: number = 5): Promise<FileNode[]> {
  const dirPath = join(PROJECTS_DIR, projectId, subPath);

  if (!isAllowedPath(projectId, subPath)) {
    throw new Error('Path traversal not allowed');
  }

  let entries;
  try {
    entries = await readdir(dirPath);
  } catch {
    return [];
  }

  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (IGNORED_FILES.has(entry)) continue;

    const fullPath = join(dirPath, entry);
    const relPath = join(subPath, entry);

    let s;
    try {
      s = await stat(fullPath);
    } catch {
      continue;
    }

    if (s.isDirectory()) {
      if (IGNORED_DIRS.has(entry)) continue;

      const node: FileNode = {
        name: entry,
        path: relPath,
        type: 'directory',
        modifiedAt: s.mtime.toISOString(),
      };

      if (depth < maxDepth) {
        node.children = await getFileTree(projectId, relPath, depth + 1, maxDepth);
      }

      nodes.push(node);
    } else {
      const ext = extname(entry);
      if (!ALLOWED_EXTENSIONS.has(ext) && !entry.endsWith('.scene.json')) continue;

      nodes.push({
        name: entry,
        path: relPath,
        type: 'file',
        size: s.size,
        modifiedAt: s.mtime.toISOString(),
        extension: ext,
      });
    }
  }

  // Sort: directories first, then alphabetically
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function readFileContent(projectId: string, filePath: string): Promise<FileContent> {
  if (!isAllowedPath(projectId, filePath)) {
    throw new Error('Path traversal not allowed');
  }

  const fullPath = join(PROJECTS_DIR, projectId, filePath);
  const s = await stat(fullPath);
  const ext = extname(filePath);

  if (isTextFile(ext)) {
    const content = await readFile(fullPath, 'utf-8');
    return {
      path: filePath,
      content,
      encoding: 'utf-8',
      size: s.size,
      modifiedAt: s.mtime.toISOString(),
    };
  } else {
    const buffer = await readFile(fullPath);
    return {
      path: filePath,
      content: buffer.toString('base64'),
      encoding: 'base64',
      size: s.size,
      modifiedAt: s.mtime.toISOString(),
    };
  }
}

export async function writeFileContent(
  projectId: string,
  filePath: string,
  content: string,
  encoding: 'utf-8' | 'base64' = 'utf-8'
): Promise<FileWriteResult> {
  if (!isAllowedPath(projectId, filePath)) {
    throw new Error('Path traversal not allowed');
  }

  const fullPath = join(PROJECTS_DIR, projectId, filePath);
  let created = false;

  try {
    await stat(fullPath);
  } catch {
    created = true;
  }

  // Ensure parent directory exists
  await mkdir(dirname(fullPath), { recursive: true });

  if (encoding === 'base64') {
    await writeFile(fullPath, Buffer.from(content, 'base64'));
  } else {
    await writeFile(fullPath, content, 'utf-8');
  }

  const s = await stat(fullPath);
  return { path: filePath, size: s.size, created };
}

export async function deleteFile(projectId: string, filePath: string): Promise<boolean> {
  if (!isAllowedPath(projectId, filePath)) {
    throw new Error('Path traversal not allowed');
  }

  const fullPath = join(PROJECTS_DIR, projectId, filePath);

  try {
    const s = await stat(fullPath);
    if (s.isDirectory()) {
      await rm(fullPath, { recursive: true, force: true });
    } else {
      await unlink(fullPath);
    }
    return true;
  } catch {
    return false;
  }
}

export async function createDirectory(projectId: string, dirPath: string): Promise<boolean> {
  if (!isAllowedPath(projectId, dirPath)) {
    throw new Error('Path traversal not allowed');
  }

  const fullPath = join(PROJECTS_DIR, projectId, dirPath);
  await mkdir(fullPath, { recursive: true });
  return true;
}

export async function searchFiles(projectId: string, query: string): Promise<FileNode[]> {
  const results: FileNode[] = [];
  const lowerQuery = query.toLowerCase();

  async function walk(subPath: string) {
    const nodes = await getFileTree(projectId, subPath, 0, 10);
    for (const node of nodes) {
      if (node.name.toLowerCase().includes(lowerQuery)) {
        results.push(node);
      }
      if (node.type === 'directory' && node.children) {
        await walk(node.path);
      }
    }
  }

  await walk('');
  return results;
}
