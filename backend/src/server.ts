import { buildApp } from './app.js';
import { env } from './config/env.js';
import { startWorkers } from './workers/index.js';
import { prisma } from './config/database.js';
import { redisConnection } from './config/queue.js';

async function main() {
  try {
    const app = await buildApp();

    // Start in-process background workers
    startWorkers();

    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    console.log(`=================================================`);
    console.log(`🚀 NovaCut Studio Backend running on http://${env.HOST}:${env.PORT}`);
    console.log(`📡 Health check: http://localhost:${env.PORT}/api/health`);
    console.log(`📁 Local Storage: ${env.STORAGE_DIR}`);
    console.log(`🤖 AI Planner: Google Gemini (${env.GEMINI_MODEL})`);
    console.log(`🎙️ Whisper Model: ${env.WHISPER_MODEL}`);
    console.log(`⚡ Job Engine: In-Process Queue (Zero External Dependencies)`);
    console.log(`=================================================`);

    const shutdown = async (signal: string) => {
      console.log(`[Server] Received ${signal}, shutting down gracefully...`);
      await app.close();
      await prisma.$disconnect();
      redisConnection.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
