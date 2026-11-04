import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().default('file:./dev.db'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),

  STORAGE_DIR: z.string().default('./storage'),
  MAX_UPLOAD_SIZE_BYTES: z.coerce.number().default(2147483648), // 2GB

  FFMPEG_PATH: z.string().default('ffmpeg'),
  FFPROBE_PATH: z.string().default('ffprobe'),
  PYTHON_PATH: z.string().default('python'),

  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('qwen2.5:0.5b'),
  WHISPER_MODEL: z.string().default('tiny'),

  WORKER_CONCURRENCY: z.coerce.number().default(2),
  JOB_TIMEOUT_MS: z.coerce.number().default(600000),
});

export const env = envSchema.parse(process.env);

