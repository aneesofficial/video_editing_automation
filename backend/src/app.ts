import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { env } from './config/env.js';
import { prisma } from './config/database.js';
import { clientRoutes } from './modules/clients/clients.routes.js';
import { projectRoutes } from './modules/projects/projects.routes.js';
import { uploadRoutes } from './modules/uploads/uploads.routes.js';
import { mediaRoutes } from './modules/media/media.routes.js';
import { aiDirectorRoutes } from './modules/ai-director/ai-director.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { editingRoutes } from './modules/editing/editing.routes.js';
import { renderingRoutes } from './modules/rendering/rendering.routes.js';
import { jobRoutes } from './modules/jobs/jobs.routes.js';
import { brandRoutes } from './modules/brand/brand.routes.js';
import { musicRoutes } from './modules/music/music.routes.js';
import { photoRoutes } from './modules/photo/photo.routes.js';
import { stockRoutes } from './modules/stock/stock.routes.js';
import { storageService } from './services/storage/storage.service.js';

const execFileAsync = promisify(execFile);

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
  const storagePath = storageService.getBaseDir();
  await app.register(fastifyStatic, {
    root: storagePath,
    prefix: '/storage/',
    decorateReply: false,
  });

  // Basic Health check
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'NovaCut Studio Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  });

  // Comprehensive System Health check: checks Database, FFmpeg, and Python
  app.get('/api/health', async () => {
    const checks: {
      database: { status: string; message: string };
      ffmpeg: { status: string; message: string; version?: string; path: string };
      python: { status: string; message: string; version?: string; path: string };
    } = {
      database: { status: 'checking', message: '' },
      ffmpeg: { status: 'checking', message: '', path: env.FFMPEG_PATH },
      python: { status: 'checking', message: '', path: env.PYTHON_PATH },
    };

    // 1. Database Check
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      checks.database = { status: 'ok', message: 'SQLite database connected successfully' };
    } catch (dbErr: any) {
      checks.database = { status: 'error', message: dbErr?.message || 'Database query failed' };
    }

    // 2. FFmpeg Check
    try {
      const { stdout } = await execFileAsync(env.FFMPEG_PATH, ['-version'], { timeout: 5000 });
      const firstLine = stdout.split('\n')[0].trim();
      checks.ffmpeg = {
        status: 'ok',
        message: 'FFmpeg binary operational',
        version: firstLine,
        path: env.FFMPEG_PATH,
      };
    } catch (ffErr: any) {
      checks.ffmpeg = {
        status: 'error',
        message: `FFmpeg execution error: ${ffErr?.message || 'Failed to execute'}`,
        path: env.FFMPEG_PATH,
      };
    }

    // 3. Python Check
    try {
      const { stdout, stderr } = await execFileAsync(env.PYTHON_PATH, ['--version'], { timeout: 5000 });
      const versionOutput = (stdout || stderr).trim();
      checks.python = {
        status: 'ok',
        message: 'Python runtime operational',
        version: versionOutput,
        path: env.PYTHON_PATH,
      };
    } catch (pyErr: any) {
      checks.python = {
        status: 'error',
        message: `Python execution error: ${pyErr?.message || 'Failed to execute'}`,
        path: env.PYTHON_PATH,
      };
    }

    const allOk =
      checks.database.status === 'ok' &&
      checks.ffmpeg.status === 'ok' &&
      checks.python.status === 'ok';

    return {
      status: allOk ? 'healthy' : 'degraded',
      service: 'NovaCut Studio Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      checks,
    };
  });

  // API v1 routes
  await app.register(
    async (v1) => {
      await v1.register(clientRoutes, { prefix: '/clients' });
      await v1.register(projectRoutes, { prefix: '/projects' });
      await v1.register(uploadRoutes, { prefix: '/uploads' });
      await v1.register(mediaRoutes, { prefix: '/media' });
      await v1.register(aiRoutes, { prefix: '/ai' });
      await v1.register(aiDirectorRoutes, { prefix: '/ai-director' });
      await v1.register(editingRoutes, { prefix: '/editing' });
      await v1.register(renderingRoutes, { prefix: '/rendering' });
      await v1.register(jobRoutes, { prefix: '/jobs' });
      await v1.register(brandRoutes, { prefix: '/brand' });
      await v1.register(musicRoutes, { prefix: '/music' });
      await v1.register(photoRoutes);
      await v1.register(stockRoutes);
    },
    { prefix: '/api/v1' }
  );

  return app;
}
