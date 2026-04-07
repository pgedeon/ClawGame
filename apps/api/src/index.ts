import Fastify from 'fastify';
import cors from '@fastify/cors';
import { projectRoutes } from './routes/projects';

const app = Fastify({ logger: true });

app.register(cors, { origin: '*' });

// Health check
app.get('/health', async () => ({ status: 'ok', version: '0.1.0' }));

// Project CRUD
app.register(projectRoutes);

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`ClawGame API running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
