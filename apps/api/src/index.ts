import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { projectRoutes } from './routes/projects';
import { fileRoutes } from './routes/files';
import { aiRoutes } from './routes/aiRoutes';
import { assetRoutes } from './routes/assets';
import { exportRoutes } from './routes/exportRoutes';
import { hostedRoutes } from './routes/hostedRoutes';
import { sceneAnalysisRoutes } from './routes/sceneAnalysis';
import { saveRoutes } from './routes/saves';
import { gitRoutes } from './routes/git';
import { imageProcessingRoutes } from './routes/imageProcessingRoutes';
import { sfxRoutes } from './routes/sfxRoutes';
import { spriteSheetRoutes } from './routes/spriteSheetRoutes';
import { generativeMediaRoutes } from './routes/generativeMediaRoutes';

// Load version from VERSION.json at project root
const __dirname = dirname(fileURLToPath(import.meta.url));
const versionPath = join(__dirname, '../../VERSION.json');
let version = '0.0.0-dev';
try {
  const versionData = JSON.parse(readFileSync(versionPath, 'utf-8'));
  version = versionData.version || version;
} catch {
  // VERSION.json not found, use fallback
}

const app = Fastify({ logger: true });

app.register(cors, { origin: '*' });

// Health check
app.get('/health', async () => ({ status: 'ok', version }));

// Project CRUD
app.register(projectRoutes);

// File operations
app.register(fileRoutes);

// AI command processing
app.register(aiRoutes);

// Asset management and generation
app.register(assetRoutes);

// Export functionality
app.register(exportRoutes);

// Hosted game previews
app.register(hostedRoutes);

// Scene analysis for AI context
app.register(sceneAnalysisRoutes);

// Save/Load system for RPG games
app.register(saveRoutes);

// Git version control
app.register(gitRoutes);
app.register(imageProcessingRoutes);
app.register(sfxRoutes);
app.register(spriteSheetRoutes);

// M11 Generative Media Forge - AI-powered media generation
app.register(generativeMediaRoutes);

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`ClawGame API v${version} running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
