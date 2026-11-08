import { execFile } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { env } from '../../config/env.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DetectedSceneResult {
  scene_index: number;
  start_time: number;
  end_time: number;
  duration: number;
  cut_type: string;
  score?: number;
}

export interface TranscriptionWordResult {
  word: string;
  start: number;
  end: number;
  probability: number;
}

export interface TranscriptionSegmentResult {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence: number;
  words: TranscriptionWordResult[];
}

export interface TranscriptionResult {
  language: string;
  duration: number;
  full_text: string;
  word_count: number;
  segments: TranscriptionSegmentResult[];
}

export interface SilenceResult {
  start: number;
  end: number;
  duration: number;
}

export class PythonBridgeService {
  private scriptPath: string;

  constructor() {
    const candidate1 = path.resolve(process.cwd(), 'python-worker/app/main.py');
    const candidate2 = path.resolve(process.cwd(), 'backend/python-worker/app/main.py');
    const candidate3 = path.resolve(__dirname, '../../../python-worker/app/main.py');

    if (fs.existsSync(candidate1)) {
      this.scriptPath = candidate1;
    } else if (fs.existsSync(candidate2)) {
      this.scriptPath = candidate2;
    } else {
      this.scriptPath = candidate3;
    }
  }

  public async detectScenes(videoPath: string, threshold = 27.0): Promise<DetectedSceneResult[]> {
    const args = [
      this.scriptPath,
      'scenes',
      '--input', videoPath,
      '--threshold', threshold.toString()
    ];

    try {
      const { stdout } = await execFileAsync(env.PYTHON_PATH, args, {
        maxBuffer: 20 * 1024 * 1024,
        timeout: env.JOB_TIMEOUT_MS
      });

      const parsed = JSON.parse(stdout.trim());
      if (parsed.success) {
        return parsed.data as DetectedSceneResult[];
      }
      throw new Error(parsed.error || 'Scene detection failed');
    } catch (err) {
      console.error('[PythonBridge] Scene detection error:', err);
      throw new Error(`Scene detection failed: ${(err as Error).message}`);
    }
  }

  public async transcribe(mediaPath: string, model: string = env.WHISPER_MODEL, language?: string): Promise<TranscriptionResult> {
    const args = [
      this.scriptPath,
      'transcribe',
      '--input', mediaPath,
      '--model', model
    ];

    if (language) {
      args.push('--language', language);
    }

    try {
      const { stdout } = await execFileAsync(env.PYTHON_PATH, args, {
        maxBuffer: 30 * 1024 * 1024,
        timeout: env.JOB_TIMEOUT_MS
      });

      const parsed = JSON.parse(stdout.trim());
      if (parsed.success) {
        return parsed.data as TranscriptionResult;
      }
      console.warn(`[PythonBridge] Transcription returned non-fatal error: ${parsed.error}`);
      return {
        language: 'en',
        duration: 0,
        full_text: '',
        word_count: 0,
        segments: [],
      };
    } catch (err) {
      console.warn(
        `[PythonBridge] Transcription non-fatal error for ${mediaPath} (continuing plan without transcript):`,
        (err as Error).message
      );
      return {
        language: 'en',
        duration: 0,
        full_text: '',
        word_count: 0,
        segments: [],
      };
    }
  }

  public async detectSilence(mediaPath: string, threshold = -30.0, minDuration = 0.5): Promise<SilenceResult[]> {
    const args = [
      this.scriptPath,
      'silence',
      '--input', mediaPath,
      '--ffmpeg', env.FFMPEG_PATH,
      '--threshold', threshold.toString(),
      '--min-duration', minDuration.toString()
    ];

    try {
      const { stdout } = await execFileAsync(env.PYTHON_PATH, args, {
        maxBuffer: 10 * 1024 * 1024,
        timeout: env.JOB_TIMEOUT_MS
      });

      const parsed = JSON.parse(stdout.trim());
      if (parsed.success) {
        return parsed.data as SilenceResult[];
      }
      return [];
    } catch (err) {
      console.warn('[PythonBridge] Silence detection warning:', err);
      return [];
    }
  }

  public async generatePhotoPreview(inputPath: string, outputPath: string): Promise<{ width: number; height: number }> {
    const args = [
      this.scriptPath,
      'photo',
      '--input', inputPath,
      '--output', outputPath
    ];

    try {
      const { stdout } = await execFileAsync(env.PYTHON_PATH, args, {
        maxBuffer: 10 * 1024 * 1024,
        timeout: env.JOB_TIMEOUT_MS
      });

      const parsed = JSON.parse(stdout.trim());
      if (parsed.success) {
        return parsed.data;
      }
      throw new Error(parsed.error || 'Photo preview generation failed');
    } catch (err) {
      console.error('[PythonBridge] Photo preview error:', err);
      throw new Error(`Photo preview generation failed: ${(err as Error).message}`);
    }
  }
}

export const pythonBridgeService = new PythonBridgeService();
