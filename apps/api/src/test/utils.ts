/**
 * @clawgame/api - Test Utilities
 */

import { mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';

export async function createProject(projectId: string) {
  const projectDir = join(process.env.PROJECTS_DIR || './data/projects', projectId);
  mkdirSync(projectDir, { recursive: true });
  
  // Create basic project structure
  mkdirSync(join(projectDir, 'assets'), { recursive: true });
  mkdirSync(join(projectDir, 'scenes'), { recursive: true });
  
  // Create a basic project config
  const config = {
    id: projectId,
    name: `Test Project ${projectId}`,
    genre: 'platformer',
    artStyle: 'pixel',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  import('fs').then(fs => {
    fs.writeFileSync(join(projectDir, 'project.json'), JSON.stringify(config, null, 2));
  });
}

export async function cleanupProject(projectId: string) {
  const projectDir = join(process.env.PROJECTS_DIR || './data/projects', projectId);
  if (existsSync(projectDir)) {
    rmSync(projectDir, { recursive: true, force: true });
  }
}

export function createMockImage(width: number, height: number, color: string = '#ff0000'): Buffer {
  // Create a simple RGBA buffer for testing
  const pixels = width * height;
  const buffer = Buffer.alloc(pixels * 4); // 4 channels per pixel (RGBA)
  
  // Fill with a solid color
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16); 
  const b = parseInt(color.slice(5, 7), 16);
  
  for (let i = 0; i < pixels; i++) {
    const offset = i * 4;
    buffer[offset] = r;     // Red
    buffer[offset + 1] = g; // Green
    buffer[offset + 2] = b; // Blue
    buffer[offset + 3] = 255; // Alpha (fully opaque)
  }
  
  return buffer;
}