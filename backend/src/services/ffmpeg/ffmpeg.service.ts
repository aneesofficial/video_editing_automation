import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { env } from '../../config/env.js';
import { storageService } from '../storage/storage.service.js';

export interface RenderClip {
  filePath: string;
  sourceIn: number;
  sourceOut: number;
  speed?: number;
  volume?: number;
}

export interface RenderCaption {
  startTime: number;
  endTime: number;
  text: string;
}

export interface RenderAudio {
  filePath: string;
  startTime: number;
  duration?: number;
  volume?: number;
}

export interface RenderOptions {
  clips: RenderClip[];
  captions?: RenderCaption[];
  audio?: RenderAudio[];
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5' | string;
  resolution?: '1080p' | '720p' | '4k' | string;
  outputPath: string;
  onProgress?: (percent: number, message: string) => void;
}

export class FFmpegService {
  /**
   * Extracts audio from video and converts to 16kHz mono WAV (ideal for Whisper).
   */
  public async extractAudioWav(inputPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-i', inputPath,
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        outputPath
      ];

      const child = spawn(env.FFMPEG_PATH, args);

      let stderr = '';
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg audio extraction failed (code ${code}): ${stderr}`));
        }
      });
    });
  }

  /**
   * Generates a representative thumbnail from a video file at a given timestamp.
   */
  public async generateThumbnail(inputPath: string, outputPath: string, timeSec: number = 1.0): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-ss', timeSec.toString(),
        '-i', inputPath,
        '-vframes', '1',
        '-vf', 'scale=640:-1',
        outputPath
      ];

      const child = spawn(env.FFMPEG_PATH, args);
      let stderr = '';
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg thumbnail generation failed (code ${code}): ${stderr}`));
        }
      });
    });
  }

  /**
   * Generates an SRT subtitle file from captions list.
   */
  public createSrtFile(captions: RenderCaption[], outputPath: string): string {
    const formatTime = (seconds: number): string => {
      const pad = (n: number, z = 2) => ('00' + n).slice(-z);
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
    };

    let srtContent = '';
    captions.forEach((cap, index) => {
      srtContent += `${index + 1}\n`;
      srtContent += `${formatTime(cap.startTime)} --> ${formatTime(cap.endTime)}\n`;
      srtContent += `${cap.text}\n\n`;
    });

    fs.writeFileSync(outputPath, srtContent, 'utf-8');
    return outputPath;
  }

  /**
   * Renders the complete edit decision list into a high-quality MP4 file.
   */
  public async renderTimeline(options: RenderOptions): Promise<string> {
    const { clips, captions = [], audio = [], aspectRatio = '16:9', outputPath, onProgress } = options;

    if (!clips || clips.length === 0) {
      throw new Error('Cannot render video: no clips provided');
    }

    // Determine target dimensions
    let targetWidth = 1920;
    let targetHeight = 1080;
    if (aspectRatio === '9:16') {
      targetWidth = 1080;
      targetHeight = 1920;
    } else if (aspectRatio === '1:1') {
      targetWidth = 1080;
      targetHeight = 1080;
    }

    // Calculate total expected duration
    let totalDuration = 0;
    for (const c of clips) {
      totalDuration += Math.max(0.1, (c.sourceOut - c.sourceIn) / (c.speed || 1.0));
    }

    onProgress?.(10, 'Preparing video filters and segment assembly');

    // Build FFmpeg arguments with complex filter graph
    const args: string[] = ['-y'];

    // Add clip inputs
    for (const clip of clips) {
      args.push('-ss', clip.sourceIn.toString(), '-to', clip.sourceOut.toString(), '-i', clip.filePath);
    }

    // Add audio inputs if any
    let bgAudioInputIndex = -1;
    if (audio.length > 0 && fs.existsSync(audio[0].filePath)) {
      bgAudioInputIndex = clips.length;
      args.push('-i', audio[0].filePath);
    }

    // Filter graph construction
    const filterComplexParts: string[] = [];

    // Scale and pad each clip to target resolution
    for (let i = 0; i < clips.length; i++) {
      const vTag = `v${i}`;
      const aTag = `a${i}`;
      // Scale with aspect ratio preservation and black letterbox padding
      filterComplexParts.push(
        `[${i}:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[${vTag}]`
      );
      // Ensure audio format standard
      filterComplexParts.push(
        `[${i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[${aTag}]`
      );
    }

    // Concatenate all video and audio streams
    const concatVideoInputs = clips.map((_, i) => `[v${i}]`).join('');
    const concatAudioInputs = clips.map((_, i) => `[a${i}]`).join('');
    filterComplexParts.push(
      `${concatVideoInputs}concat=n=${clips.length}:v=1:a=0[v_concat]`,
      `${concatAudioInputs}concat=n=${clips.length}:v=0:a=1[a_concat]`
    );

    let finalVideoTag = '[v_concat]';
    let finalAudioTag = '[a_concat]';

    // Subtitles / Captions if present
    if (captions.length > 0) {
      const tempSrt = storageService.getTempPath(`subs_${Date.now()}.srt`);
      this.createSrtFile(captions, tempSrt);
      // Escape Windows path for subtitles filter: backslashes need escaping or forward slashes
      const escapedSrt = tempSrt.replace(/\\/g, '/').replace(/:/g, '\\:');
      filterComplexParts.push(
        `${finalVideoTag}subtitles='${escapedSrt}':force_style='FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,BackColour=&H80000000'[v_captioned]`
      );
      finalVideoTag = '[v_captioned]';
    }

    // Mix background audio if provided
    if (bgAudioInputIndex >= 0) {
      const bgVol = audio[0].volume ?? 0.3;
      filterComplexParts.push(
        `[${bgAudioInputIndex}:a]volume=${bgVol},aloop=loop=-1:size=2e+09[bg_looped]`,
        `${finalAudioTag}[bg_looped]amix=inputs=2:duration=first:dropout_transition=2[a_mixed]`
      );
      finalAudioTag = '[a_mixed]';
    }

    args.push('-filter_complex', filterComplexParts.join(';'));
    args.push('-map', finalVideoTag);
    args.push('-map', finalAudioTag);
    args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p');
    args.push('-c:a', 'aac', '-b:a', '192k');
    args.push('-t', totalDuration.toString());
    args.push('-progress', 'pipe:1');
    args.push(outputPath);

    onProgress?.(25, 'Encoding video with FFmpeg');

    return new Promise((resolve, reject) => {
      const child = spawn(env.FFMPEG_PATH, args);

      let stdoutBuf = '';
      let stderrBuf = '';

      child.stdout.on('data', (chunk) => {
        stdoutBuf += chunk.toString();
        const lines = stdoutBuf.split('\n');
        stdoutBuf = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('out_time_ms=')) {
            const outTimeMs = parseInt(line.split('=')[1], 10);
            if (!isNaN(outTimeMs) && totalDuration > 0) {
              const currentSec = outTimeMs / 1000000;
              const pct = Math.min(95, Math.max(25, 25 + Math.round((currentSec / totalDuration) * 70)));
              onProgress?.(pct, `Encoding at ${Math.round(currentSec)}s / ${Math.round(totalDuration)}s`);
            }
          }
        }
      });

      child.stderr.on('data', (d) => {
        stderrBuf += d.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          onProgress?.(100, 'Rendering completed successfully');
          resolve(outputPath);
        } else {
          console.error('[FFmpeg Error]', stderrBuf);
          reject(new Error(`FFmpeg rendering failed (code ${code}): ${stderrBuf.slice(-500)}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }
}

export const ffmpegService = new FFmpegService();
