import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { env } from './config/env.js';
import { projectRoutes } from './modules/projects/projects.routes.js';
import { uploadRoutes } from './modules/uploads/uploads.routes.js';
import { mediaRoutes } from './modules/media/media.routes.js';
import { aiDirectorRoutes } from './modules/ai-director/ai-director.routes.js';
import { editingRoutes } from './modules/editing/editing.routes.js';
import { renderingRoutes } from './modules/rendering/rendering.routes.js';
import { jobRoutes } from './modules/jobs/jobs.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'error',
    },
    bodyLimit: 10 * 1024 * 1024, // 10MB JSON body limit
  });

  // Plugins
  await app.register(sensible);

  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow localhost and local dev origins
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        cb(null, true);
        return;
      }
      cb(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: env.MAX_UPLOAD_SIZE_BYTES,
    },
  });

  // Serve static files from storage directory
  const storagePath = path.resolve(process.cwd(), env.STORAGE_DIR);
  await app.register(fastifyStatic, {
    root: storagePath,
    prefix: '/storage/',
    decorateReply: false,
  });

  // Health check
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'NovaCut Studio Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  });
  app.get('/api/health', async () => {
    return {
      status: 'ok',
      service: 'NovaCut Studio Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  });

  // API v1 routes
  await app.register(
    async (v1) => {
      await v1.register(projectRoutes, { prefix: '/projects' });
      await v1.register(uploadRoutes, { prefix: '/uploads' });
      await v1.register(mediaRoutes, { prefix: '/media' });
      await v1.register(aiDirectorRoutes, { prefix: '/ai-director' });
      await v1.register(editingRoutes, { prefix: '/editing' });
      await v1.register(renderingRoutes, { prefix: '/rendering' });
      await v1.register(jobRoutes, { prefix: '/jobs' });
    },
    { prefix: '/api/v1' }
  );

  return app;
}
