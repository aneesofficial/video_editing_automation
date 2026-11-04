import { buildApp } from './app.js';
import { env } from './config/env.js';
import { startWorkers } from './workers/index.js';
import { prisma } from './config/database.js';
import { redisConnection } from './config/queue.js';

async function main() {
  try {
    const app = await buildApp();

    // Start BullMQ workers in background
    startWorkers();

    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    console.log(`=================================================`);
    console.log(`🚀 NovaCut Studio Backend running on http://${env.HOST}:${env.PORT}`);
    console.log(`📡 Health check: http://localhost:${env.PORT}/health`);
    console.log(`📁 Local Storage: ${env.STORAGE_DIR}`);
    console.log(`🧠 AI Ollama: ${env.OLLAMA_BASE_URL} (${env.OLLAMA_MODEL})`);
    console.log(`🎙️ Whisper Model: ${env.WHISPER_MODEL}`);
    console.log(`⚡ Redis: ${env.REDIS_URL}`);
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

