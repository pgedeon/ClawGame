/**
 * @clawgame/api - Git Routes
 * Version control endpoints for projects
 */

import { FastifyInstance } from 'fastify';
import { execSync } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

const PROJECTS_DIR = process.env.PROJECTS_DIR || './data/projects';

function projectDir(projectId: string): string {
  return join(PROJECTS_DIR, projectId);
}

function isGitRepo(dir: string): boolean {
  return existsSync(join(dir, '.git'));
}

function git(dir: string, cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { cwd: dir, encoding: 'utf-8', timeout: 10_000 }).trim();
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string };
    throw new Error(err.stderr || err.message || 'Git command failed');
  }
}

interface ChangedFile {
  path: string;
  status: string;
}

interface CommitEntry {
  hash: string;
  message: string;
  author: string;
  date: string;
  filesChanged: number;
}

interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
}

export async function gitRoutes(app: FastifyInstance) {
  // Get git status
  app.get<{
    Params: { id: string };
  }>('/api/projects/:id/git/status', async (request, reply) => {
    const dir = projectDir(request.params.id);
    if (!isGitRepo(dir)) {
      return { initialized: false, branch: null, ahead: 0, behind: 0, changedFiles: [], recentCommits: [] };
    }

    const status = git(dir, 'status --porcelain');
    const changedFiles: ChangedFile[] = status
      .split('\n')
      .filter(Boolean)
      .map((line: string) => ({
        path: line.slice(3),
        status: line.slice(0, 2).trim(),
      }));

    let branch = '';
    let ahead = 0;
    let behind = 0;
    try { branch = git(dir, 'rev-parse --abbrev-ref HEAD'); } catch { branch = 'HEAD'; }
    try { ahead = parseInt(git(dir, 'rev-list --count @{upstream}..HEAD'), 10) || 0; } catch { /* no upstream */ }
    try { behind = parseInt(git(dir, 'rev-list --count HEAD..@{upstream}'), 10) || 0; } catch { /* no upstream */ }

    const log = git(dir, 'log --oneline -20');
    const recentCommits = log.split('\n').filter(Boolean).map((line: string) => {
      const spaceIdx = line.indexOf(' ');
      return { hash: line.slice(0, spaceIdx), message: line.slice(spaceIdx + 1) };
    });

    return { initialized: true, branch, ahead, behind, changedFiles, recentCommits };
  });

  // Stage all and commit
  app.post<{
    Params: { id: string };
    Body: { message: string };
  }>('/api/projects/:id/git/commit', async (request, reply) => {
    const dir = projectDir(request.params.id);
    const { message } = request.body;
    if (!message?.trim()) {
      return reply.code(400).send({ error: 'Commit message is required' });
    }
    git(dir, 'add -A');
    git(dir, `commit -m ${JSON.stringify(message)}`);
    const hash = git(dir, 'rev-parse --short HEAD');
    return { success: true, hash, message };
  });

  // Full log with details
  app.get<{
    Params: { id: string };
    Querystring: { limit?: string };
  }>('/api/projects/:id/git/log', async (request) => {
    const dir = projectDir(request.params.id);
    if (!isGitRepo(dir)) return { commits: [] };
    const limit = Math.min(parseInt(request.query.limit || '50', 10), 200) || 50;
    const log = git(dir, `log --pretty=format:%H%n%s%n%an%n%ai --name-only -${limit}`);
    const commits: CommitEntry[] = [];
    const blocks = log.split('\n\n');
    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 4) continue;
      commits.push({
        hash: lines[0].slice(0, 7),
        message: lines[1],
        author: lines[2],
        date: lines[3],
        filesChanged: lines.slice(4).filter(Boolean).length,
      });
    }
    return { commits };
  });

  // Initialize git repo
  app.post<{
    Params: { id: string };
  }>('/api/projects/:id/git/init', async (request) => {
    const dir = projectDir(request.params.id);
    if (isGitRepo(dir)) return { initialized: false };
    git(dir, 'init');
    return { initialized: true };
  });

  // Diff stat
  app.get<{
    Params: { id: string };
  }>('/api/projects/:id/git/diff', async (request) => {
    const dir = projectDir(request.params.id);
    if (!isGitRepo(dir)) return { files: [], summary: '' };
    const raw = git(dir, 'diff --stat HEAD 2>/dev/null || diff --stat');
    const lines = raw.split('\n').filter(Boolean);
    const files: DiffFile[] = [];
    let summary = '';
    for (const line of lines) {
      const match = line.match(/^\s*(.+?)\s+\|\s+(\d+)\s+([+-]+)/);
      if (match) {
        files.push({
          path: match[1].trim(),
          additions: (match[3]?.match(/\+/g)?.length) || 0,
          deletions: (match[3]?.match(/-/g)?.length) || 0,
        });
      } else if (line.includes('changed') || line.includes('file')) {
        summary = line.trim();
      }
    }
    return { files, summary };
  });

  // Revert file or commit
  app.post<{
    Params: { id: string };
    Body: { filePath?: string; commitHash?: string };
  }>('/api/projects/:id/git/revert', async (request, reply) => {
    const dir = projectDir(request.params.id);
    const { filePath, commitHash } = request.body;
    if (filePath) {
      git(dir, `checkout -- ${JSON.stringify(filePath)}`);
      return { success: true };
    }
    if (commitHash) {
      git(dir, `revert --no-edit ${commitHash}`);
      return { success: true };
    }
    return reply.code(400).send({ error: 'Provide filePath or commitHash' });
  });
}
