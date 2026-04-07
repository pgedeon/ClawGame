import Fastify from 'fastify';
import cors from '@fastify/cors';

const app = Fastify({ logger: true });

app.register(cors, { origin: '*' });

app.get('/health', async () => ({ status: 'ok', version: '0.0.1' }));

app.get('/api/projects', async () => ({ projects: [] }));

app.post('/api/projects', async (request, reply) => {
  return { id: 'proj_001', name: 'New Project', createdAt: new Date().toISOString() };
});

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
