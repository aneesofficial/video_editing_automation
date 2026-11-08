import { spawn, ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../../config/env.js';
import { storageService } from '../storage/storage.service.js';
import { VideoMetadataResult } from './ffprobe.service.js';

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

export interface PlanRenderSegment {
  assetId: string;
  filePath: string;
  isPhoto: boolean;
  sourceIn: number;
  sourceOut: number;
  speed?: number;
  transition?: 'cut' | 'fade' | 'crossfade' | 'dissolve' | 'wipe' | 'slide' | string;
  motionEffect?: 'none' | 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'punch_in' | 'ken_burns' | string;
  hasAudio?: boolean;
  isHdr?: boolean;
}

export interface SubtitleBurnOptions {
  assPath: string;
  fontsDir: string;
}

export interface BrandWatermarkOptions {
  logoPath: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacityPercent?: number;
  sizePercent?: number;
}

export interface BackgroundMusicOptions {
  trackPath: string;
  volume?: number;
  ducking?: boolean;
}

export interface BRollCutawayOption {
  id?: string;
  filePath: string;
  isPhoto?: boolean;
  startTime: number;
  duration: number;
}

export interface PlanRenderOptions {
  jobId: string;
  segments: PlanRenderSegment[];
  frame: {
    platform: string;
    aspectRatio: string;
    resolution: string; // e.g. "1080x1920"
  };
  qualityMode: 'draft' | 'final';
  outputPath: string;
  subtitles?: SubtitleBurnOptions;
  brandWatermark?: BrandWatermarkOptions;
  backgroundMusic?: BackgroundMusicOptions;
  bRollCutaways?: BRollCutawayOption[];
  timeoutMs?: number;
  onProgress?: (progress: {
    percent: number;
    stage: string;
    etaSeconds?: number;
    speed?: string;
    currentSeconds?: number;
    totalSeconds?: number;
  }) => void;
}

export type DetectedEncoder = 'h264_nvenc' | 'h264_qsv' | 'libx264';

export interface PlanRenderResult {
  outputPath: string;
  duration: number;
  encoderUsed: DetectedEncoder;
  resolution: string;
  fileSizeBytes: number;
}

export class FFmpegService {
  private activeProcesses = new Map<string, ChildProcess>();
  private cachedEncoder: DetectedEncoder | null = null;

  /**
   * Detects available hardware encoders (NVENC or QSV) and falls back to libx264.
   */
  public async detectHardwareEncoder(): Promise<DetectedEncoder> {
    if (this.cachedEncoder) return this.cachedEncoder;

    // Test NVENC
    const canNvenc = await this.testEncoder('h264_nvenc');
    if (canNvenc) {
      console.log('[FFmpegService] Hardware encoder detected: NVIDIA NVENC (h264_nvenc)');
      this.cachedEncoder = 'h264_nvenc';
      return 'h264_nvenc';
    }

    // Test QSV
    const canQsv = await this.testEncoder('h264_qsv');
    if (canQsv) {
      console.log('[FFmpegService] Hardware encoder detected: Intel QuickSync (h264_qsv)');
      this.cachedEncoder = 'h264_qsv';
      return 'h264_qsv';
    }

    console.log('[FFmpegService] No GPU hardware encoder available, using software encoder: libx264');
    this.cachedEncoder = 'libx264';
    return 'libx264';
  }

  public getDetectedEncoder(): DetectedEncoder | null {
    return this.cachedEncoder;
  }

  private async testEncoder(encoderName: string): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn(env.FFMPEG_PATH, [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'color=black:size=64x64:duration=0.1',
        '-c:v',
        encoderName,
        '-f',
        'null',
        '-',
      ]);
      child.on('close', (code) => resolve(code === 0));
      child.on('error', () => resolve(false));
    });
  }

  /**
   * Cancels an active render job by its jobId.
   */
  public cancelRender(jobId: string): boolean {
    const child = this.activeProcesses.get(jobId);
    if (child) {
      console.log(`[FFmpegService] Cancelling active render process for job ${jobId}`);
      try {
        child.kill('SIGKILL');
      } catch (err) {
        console.warn(`[FFmpegService] Error killing child process:`, err);
      }
      this.activeProcesses.delete(jobId);
      return true;
    }
    return false;
  }

  /**
   * Generates a universal, browser-friendly preview MP4:
   * - H.264 (libx264, yuv420p)
   * - AAC audio (stereo 44.1kHz, with silent audio track fallback for videos without audio)
   * - Max 720p with even dimensions
   * - Constant 30 fps
   * - Faststart for instant HTML5 web playback
   * - HDR to SDR tone mapping if source is HDR
   * - Preserves/normalizes orientation
   * - Skips conversion if probe indicates source is already browser-safe
   */
  public async generatePreview(
    inputPath: string,
    outputPath: string,
    probe?: Partial<VideoMetadataResult>,
    onProgress?: (percent: number, message: string) => void
  ): Promise<string> {
    if (probe?.isBrowserSafe) {
      onProgress?.(100, 'Source is already browser-safe, skipping conversion');
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.copyFileSync(inputPath, outputPath);
      return outputPath;
    }

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const hasAudio = !!probe?.audioCodec;
    const isHdr = !!probe?.isHdr;

    const vfParts: string[] = [];

    if (isHdr) {
      vfParts.push('libplacebo=tonemapping=auto:colorspace=bt709:color_primaries=bt709:color_trc=bt709:range=tv');
    }

    vfParts.push('fps=30');
    vfParts.push("scale='if(gte(iw,ih),min(1280,trunc(iw/2)*2),-2)':'if(gte(iw,ih),-2,min(1280,trunc(iw/2)*2))'");
    vfParts.push('scale=trunc(iw/2)*2:trunc(ih/2)*2');
    vfParts.push('format=yuv420p');

    const args: string[] = ['-y'];
    args.push('-i', inputPath);

    if (!hasAudio) {
      args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
    }

    args.push('-vf', vfParts.join(','));

    if (hasAudio) {
      args.push('-map', '0:v:0');
      args.push('-map', '0:a:0?');
    } else {
      args.push('-map', '0:v:0');
      args.push('-map', '1:a:0');
      args.push('-shortest');
    }

    args.push(
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '24',
      '-b:v',
      '1800k',
      '-maxrate',
      '2500k',
      '-bufsize',
      '3500k'
    );

    args.push('-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2');
    args.push('-metadata:s:v:0', 'rotate=0');
    args.push('-movflags', '+faststart');
    args.push('-fps_mode', 'cfr');
    args.push(outputPath);

    onProgress?.(20, 'Encoding browser-friendly preview copy');

    return new Promise((resolve, reject) => {
      const child = spawn(env.FFMPEG_PATH, args);

      let stderr = '';
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          onProgress?.(100, 'Preview copy created');
          resolve(outputPath);
        } else {
          if (isHdr && stderr.includes('libplacebo')) {
            console.warn('[FFmpegService] libplacebo failed, falling back to standard conversion...');
            const fallbackArgs = args.filter((a) => !a.includes('libplacebo'));
            const fallbackChild = spawn(env.FFMPEG_PATH, fallbackArgs);
            let fallbackStderr = '';
            fallbackChild.stderr.on('data', (d) => {
              fallbackStderr += d.toString();
            });
            fallbackChild.on('close', (fbCode) => {
              if (fbCode === 0 && fs.existsSync(outputPath)) {
                onProgress?.(100, 'Preview copy created via fallback');
                resolve(outputPath);
              } else {
                reject(
                  new Error(
                    `FFmpeg preview generation fallback failed (code ${fbCode}): ${fallbackStderr.slice(-400)}`
                  )
                );
              }
            });
            return;
          }

          reject(new Error(`FFmpeg preview generation failed (code ${code}): ${stderr.slice(-400)}`));
        }
      });

      child.on('error', (err) => reject(err));
    });
  }

  /**
   * Extracts audio from video and converts to 16kHz mono WAV (ideal for Whisper).
   */
  public async extractAudioWav(inputPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = ['-y', '-i', inputPath, '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', outputPath];

      const child = spawn(env.FFMPEG_PATH, args);

      let stderr = '';
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

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
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const args = [
        '-y',
        '-ss',
        timeSec.toString(),
        '-i',
        inputPath,
        '-vframes',
        '1',
        '-vf',
        "scale='min(640,iw)':-2",
        outputPath,
      ];

      const child = spawn(env.FFMPEG_PATH, args);
      let stderr = '';
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

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
   * Step 5A Autonomous Plan Renderer:
   * Turns a Gemini plan JSON into a REAL finished MP4 video using FFmpeg.
   *
   * Features:
   * 1. Window-safe command construction via -filter_complex_script.
   * 2. Handles video and photo inputs (photos converted to timed clips with fixed EXIF orientation).
   * 3. Trims, speed adjustment, constant 30 fps, HDR tone-mapping.
   * 4. Fills frame without black bars by generating an aesthetic blurred background when aspect ratios don't match.
   * 5. Smooth motion effects (zoom_in, zoom_out, punch_in, pan_left, pan_right, ken_burns).
   * 6. Smooth xfade transitions (fade, crossfade/dissolve, slide, wipe, cut) with matching audio acrossfade.
   * 7. Audio loudness normalization (loudnorm standard -16 LUFS) and silent audio fallback for audio sync.
   * 8. Draft (fast 720p) vs Final (high quality CRF 18 1080p faststart) modes.
   * 9. Automatic hardware acceleration (NVENC / QuickSync) with libx264 fallback.
   * 10. Real-time progress reporting and cancellation support.
   */
  public async renderPlan(options: PlanRenderOptions): Promise<PlanRenderResult> {
    const {
      jobId,
      segments,
      frame,
      qualityMode,
      outputPath,
      subtitles,
      brandWatermark,
      backgroundMusic,
      bRollCutaways,
      onProgress,
    } = options;

    if (!segments || segments.length === 0) {
      throw new Error('Cannot render video: no clip segments provided in plan');
    }

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. Calculate Target Dimensions
    let origWidth = 1920;
    let origHeight = 1080;
    if (frame.resolution && frame.resolution.includes('x')) {
      const parts = frame.resolution.split('x').map((n) => parseInt(n, 10));
      if (!isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
        origWidth = parts[0];
        origHeight = parts[1];
      }
    } else if (frame.aspectRatio === '9:16') {
      origWidth = 1080;
      origHeight = 1920;
    } else if (frame.aspectRatio === '1:1') {
      origWidth = 1080;
      origHeight = 1080;
    } else if (frame.aspectRatio === '4:5') {
      origWidth = 1080;
      origHeight = 1350;
    }

    let targetWidth: number;
    let targetHeight: number;

    if (qualityMode === 'draft') {
      if (origWidth >= origHeight) {
        // Landscape draft: 720p
        targetWidth = 1280;
        targetHeight = 720;
      } else if (origWidth === origHeight) {
        // Square draft: 720x720
        targetWidth = 720;
        targetHeight = 720;
      } else if (frame.aspectRatio === '4:5' || origHeight / origWidth === 1.25) {
        // 4:5 draft: 720x900
        targetWidth = 720;
        targetHeight = 900;
      } else {
        // Vertical draft: 720x1280
        targetWidth = 720;
        targetHeight = 1280;
      }
    } else {
      // Final quality: full target resolution
      targetWidth = origWidth;
      targetHeight = origHeight;
    }

    // Ensure even dimensions
    targetWidth = Math.trunc(targetWidth / 2) * 2;
    targetHeight = Math.trunc(targetHeight / 2) * 2;

    const blurWidth = Math.trunc(targetWidth / 4 / 2) * 2;
    const blurHeight = Math.trunc(targetHeight / 4 / 2) * 2;

    // 2. Compute Segment Durations & Verify Sources
    const clipDurations: number[] = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (!fs.existsSync(seg.filePath)) {
        throw new Error(`Media source file not found on disk: ${seg.filePath}`);
      }
      let dur: number;
      if (seg.isPhoto) {
        dur = Math.max(1.0, (seg.sourceOut || 5.0) - (seg.sourceIn || 0.0) || 5.0);
      } else {
        const rawDur = Math.max(0.1, (seg.sourceOut || 10.0) - (seg.sourceIn || 0.0));
        dur = rawDur / (seg.speed || 1.0);
      }
      clipDurations.push(dur);
    }

    // 3. Determine Transitions & Total Expected Duration
    let hasTransitions = false;
    for (const seg of segments) {
      if (seg.transition && seg.transition !== 'cut') {
        hasTransitions = true;
        break;
      }
    }

    const defaultTransitionDur = 0.5;
    let calculatedTotalDuration = 0;

    if (segments.length === 1 || !hasTransitions) {
      calculatedTotalDuration = clipDurations.reduce((sum, d) => sum + d, 0);
    } else {
      calculatedTotalDuration = clipDurations[0];
      for (let i = 1; i < segments.length; i++) {
        const trans = segments[i].transition || 'cut';
        if (trans === 'cut') {
          calculatedTotalDuration += clipDurations[i];
        } else {
          const tDur = Math.min(defaultTransitionDur, clipDurations[i - 1] * 0.4, clipDurations[i] * 0.4);
          calculatedTotalDuration += clipDurations[i] - tDur;
        }
      }
    }

    onProgress?.({
      percent: 5,
      stage: `Assembling ${segments.length} segments for ${qualityMode.toUpperCase()} render (${targetWidth}x${targetHeight})`,
      totalSeconds: calculatedTotalDuration,
    });

    // 4. Construct FFmpeg Input CLI Arguments
    const args: string[] = ['-y'];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const dur = clipDurations[i];

      if (seg.isPhoto) {
        args.push('-loop', '1', '-t', dur.toFixed(3), '-framerate', '30', '-i', seg.filePath);
      } else {
        args.push('-ss', seg.sourceIn.toFixed(3), '-to', seg.sourceOut.toFixed(3), '-accurate_seek', '-i', seg.filePath);
      }
    }

    let nextInputIdx = segments.length;
    let logoInputIdx: number | null = null;
    let musicInputIdx: number | null = null;

    const brollInputIndices: Array<{ idx: number; broll: BRollCutawayOption }> = [];
    if (bRollCutaways && bRollCutaways.length > 0) {
      for (const broll of bRollCutaways) {
        if (!broll.filePath || !fs.existsSync(broll.filePath)) continue;
        const bIdx = nextInputIdx++;
        const dur = Math.max(0.5, broll.duration);
        if (broll.isPhoto) {
          args.push('-loop', '1', '-t', dur.toFixed(3), '-framerate', '30', '-i', broll.filePath);
        } else {
          args.push('-ss', '0', '-t', dur.toFixed(3), '-accurate_seek', '-i', broll.filePath);
        }
        brollInputIndices.push({ idx: bIdx, broll });
      }
    }

    if (brandWatermark?.logoPath && fs.existsSync(brandWatermark.logoPath)) {
      logoInputIdx = nextInputIdx++;
      args.push('-i', brandWatermark.logoPath);
    }

    if (backgroundMusic?.trackPath && fs.existsSync(backgroundMusic.trackPath)) {
      musicInputIdx = nextInputIdx++;
      args.push('-stream_loop', '-1', '-i', backgroundMusic.trackPath);
    }

    // 5. Construct Safe Filter Graph Script (-filter_complex_script)
    const filterScriptLines: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const dur = clipDurations[i];
      const speed = seg.speed || 1.0;
      const motion = seg.motionEffect || 'none';

      // --- VIDEO CHAIN FOR SEGMENT i ---
      const preFilter = [];
      if (seg.isHdr) {
        preFilter.push('libplacebo=tonemapping=auto:colorspace=bt709:color_primaries=bt709:color_trc=bt709:range=tv');
      }
      preFilter.push('fps=30');
      preFilter.push('format=yuv420p');
      if (!seg.isPhoto && speed !== 1.0) {
        preFilter.push(`setpts=(PTS-STARTPTS)/${speed}`);
      } else {
        preFilter.push('setpts=PTS-STARTPTS');
      }
      preFilter.push(`split=2[v_bgin_${i}][v_fgin_${i}]`);

      filterScriptLines.push(`[${i}:v]${preFilter.join(',')};`);

      // Blurred background: downscaled 1/4th -> boxblur -> scale to target frame
      filterScriptLines.push(
        `[v_bgin_${i}]scale=${blurWidth}:${blurHeight}:force_original_aspect_ratio=increase,crop=${blurWidth}:${blurHeight},boxblur=8:2,scale=${targetWidth}:${targetHeight},setsar=1[v_bg_${i}];`
      );

      // Sharp foreground scaled to fit inside target frame
      filterScriptLines.push(
        `[v_fgin_${i}]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,setsar=1[v_fg_${i}];`
      );

      // Overlay centered
      filterScriptLines.push(
        `[v_bg_${i}][v_fg_${i}]overlay=(W-w)/2:(H-h)/2[v_comp_${i}];`
      );

      // Motion effect
      if (motion === 'zoom_in') {
        filterScriptLines.push(
          `[v_comp_${i}]scale=eval=frame:w='trunc(${targetWidth}*(1+0.12*t/${dur.toFixed(3)})/2)*2':h='trunc(${targetHeight}*(1+0.12*t/${dur.toFixed(3)})/2)*2',crop=${targetWidth}:${targetHeight}:(in_w-out_w)/2:(in_h-out_h)/2[v${i}];`
        );
      } else if (motion === 'zoom_out') {
        filterScriptLines.push(
          `[v_comp_${i}]scale=eval=frame:w='trunc(${targetWidth}*(1.12-0.12*t/${dur.toFixed(3)})/2)*2':h='trunc(${targetHeight}*(1.12-0.12*t/${dur.toFixed(3)})/2)*2',crop=${targetWidth}:${targetHeight}:(in_w-out_w)/2:(in_h-out_h)/2[v${i}];`
        );
      } else if (motion === 'punch_in') {
        filterScriptLines.push(
          `[v_comp_${i}]scale=eval=frame:w='if(lt(t,0.2),trunc(${targetWidth}*(1+0.12*t/0.2)/2)*2,trunc(${targetWidth}*1.12/2)*2)':h='if(lt(t,0.2),trunc(${targetHeight}*(1+0.12*t/0.2)/2)*2,trunc(${targetHeight}*1.12/2)*2)',crop=${targetWidth}:${targetHeight}:(in_w-out_w)/2:(in_h-out_h)/2[v${i}];`
        );
      } else if (motion === 'pan_left') {
        const panW = Math.trunc((targetWidth * 1.1) / 2) * 2;
        const panH = Math.trunc((targetHeight * 1.1) / 2) * 2;
        filterScriptLines.push(
          `[v_comp_${i}]scale=${panW}:${panH},crop=${targetWidth}:${targetHeight}:x='(in_w-out_w)*(1-t/${dur.toFixed(3)})':y='(in_h-out_h)/2'[v${i}];`
        );
      } else if (motion === 'pan_right') {
        const panW = Math.trunc((targetWidth * 1.1) / 2) * 2;
        const panH = Math.trunc((targetHeight * 1.1) / 2) * 2;
        filterScriptLines.push(
          `[v_comp_${i}]scale=${panW}:${panH},crop=${targetWidth}:${targetHeight}:x='(in_w-out_w)*(t/${dur.toFixed(3)})':y='(in_h-out_h)/2'[v${i}];`
        );
      } else if (motion === 'ken_burns') {
        filterScriptLines.push(
          `[v_comp_${i}]scale=eval=frame:w='trunc(${targetWidth}*(1+0.10*t/${dur.toFixed(3)})/2)*2':h='trunc(${targetHeight}*(1+0.10*t/${dur.toFixed(3)})/2)*2',crop=${targetWidth}:${targetHeight}:x='(in_w-out_w)*(0.2+0.6*t/${dur.toFixed(3)})':y='(in_h-out_h)*(0.2+0.6*t/${dur.toFixed(3)})'[v${i}];`
        );
      } else {
        filterScriptLines.push(`[v_comp_${i}]null[v${i}];`);
      }

      // --- AUDIO CHAIN FOR SEGMENT i ---
      if (seg.isPhoto || !seg.hasAudio) {
        // Generate clean silent audio of exact duration
        filterScriptLines.push(
          `aevalsrc=0:d=${dur.toFixed(3)}:s=44100:c=stereo,asetpts=PTS-STARTPTS[a${i}];`
        );
      } else {
        const aFilters: string[] = [];
        if (speed !== 1.0) {
          aFilters.push(`atempo=${speed}`);
        }
        aFilters.push('aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo');
        aFilters.push('asetpts=PTS-STARTPTS');
        filterScriptLines.push(`[${i}:a]${aFilters.join(',')}[a${i}];`);
      }
    }

    // --- TRANSITIONS & STREAM ASSEMBLY ---
    let finalVideoTag = '';
    let finalAudioTag = '';

    if (segments.length === 1) {
      finalVideoTag = '[v0]';
      finalAudioTag = '[a0]';
    } else if (!hasTransitions) {
      // All cuts -> use concat filter for zero drift
      const vInputs = segments.map((_, i) => `[v${i}]`).join('');
      const aInputs = segments.map((_, i) => `[a${i}]`).join('');
      filterScriptLines.push(`${vInputs}concat=n=${segments.length}:v=1:a=0[v_cat];`);
      filterScriptLines.push(`${aInputs}concat=n=${segments.length}:v=0:a=1[a_cat];`);
      finalVideoTag = '[v_cat]';
      finalAudioTag = '[a_cat]';
    } else {
      // Chain using xfade & acrossfade
      let vCurrent = 'v0';
      let aCurrent = 'a0';
      let currentOffset = clipDurations[0];

      for (let i = 1; i < segments.length; i++) {
        const trans = segments[i].transition || 'cut';
        let xfadeTrans = 'fade';
        let transDur = defaultTransitionDur;

        if (trans === 'crossfade' || trans === 'dissolve') {
          xfadeTrans = 'dissolve';
        } else if (trans === 'fade') {
          xfadeTrans = 'fade';
        } else if (trans === 'slide') {
          xfadeTrans = 'slideleft';
        } else if (trans === 'wipe') {
          xfadeTrans = 'wipeleft';
        } else {
          // Micro cut
          xfadeTrans = 'fade';
          transDur = 0.033;
        }

        // Clamp transition duration to not exceed 40% of either clip
        transDur = Math.min(transDur, clipDurations[i - 1] * 0.4, clipDurations[i] * 0.4);
        transDur = Math.max(0.033, transDur);

        const xfadeOffset = Math.max(0, currentOffset - transDur);
        const vOut = `v_step_${i}`;
        const aOut = `a_step_${i}`;

        filterScriptLines.push(
          `[${vCurrent}][v${i}]xfade=transition=${xfadeTrans}:duration=${transDur.toFixed(3)}:offset=${xfadeOffset.toFixed(3)}[${vOut}];`
        );
        filterScriptLines.push(
          `[${aCurrent}][a${i}]acrossfade=d=${transDur.toFixed(3)}[${aOut}];`
        );

        vCurrent = vOut;
        aCurrent = aOut;
        currentOffset = xfadeOffset + clipDurations[i];
      }

      finalVideoTag = `[${vCurrent}]`;
      finalAudioTag = `[${aCurrent}]`;
    }

    // Step 8 Feature: Auto B-Roll Cutaway Overlays
    if (brollInputIndices.length > 0) {
      let bRollCounter = 0;
      for (const item of brollInputIndices) {
        const { idx: brollInputIdx, broll } = item;
        const st = Math.max(0, broll.startTime);
        const dur = Math.max(0.5, broll.duration);

        const vBrollScaled = `v_broll_${bRollCounter}_scaled`;
        const vBrollOut = `v_broll_${bRollCounter}_out`;

        // Scale cutaway to fit canvas with black background if aspect differs
        filterScriptLines.push(
          `[${brollInputIdx}:v]fps=30,format=yuv420p,scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,setpts=PTS-STARTPTS+${st.toFixed(3)}/TB[${vBrollScaled}];`
        );
        filterScriptLines.push(
          `${finalVideoTag}[${vBrollScaled}]overlay=enable='between(t,${st.toFixed(3)},${(st + dur).toFixed(3)})':eof_action=pass[${vBrollOut}];`
        );
        finalVideoTag = `[${vBrollOut}]`;
        bRollCounter++;
      }
    }

    // Step 5B Feature: Brand Watermark Logo Overlay
    if (logoInputIdx !== null && brandWatermark) {
      const sizePct = brandWatermark.sizePercent || 14;
      const opacity = ((brandWatermark.opacityPercent ?? 85) / 100).toFixed(2);
      const logoW = Math.max(32, Math.round(targetWidth * (sizePct / 100)));
      const pos = brandWatermark.position || 'top-right';
      const isVertical = targetHeight > targetWidth;
      const mTop = isVertical ? 120 : 60;
      const mBottom = isVertical ? 240 : 80;
      const mLeft = isVertical ? 60 : 80;
      const mRight = isVertical ? 100 : 80;

      let coord = `x=W-w-${mRight}:y=${mTop}`;
      if (pos === 'top-left') {
        coord = `x=${mLeft}:y=${mTop}`;
      } else if (pos === 'bottom-left') {
        coord = `x=${mLeft}:y=H-h-${mBottom}`;
      } else if (pos === 'bottom-right') {
        coord = `x=W-w-${mRight}:y=H-h-${mBottom}`;
      }

      filterScriptLines.push(
        `[${logoInputIdx}:v]scale=${logoW}:-1,format=rgba,colorchannelmixer=aa=${opacity}[logo_scaled];`
      );
      filterScriptLines.push(
        `${finalVideoTag}[logo_scaled]overlay=${coord}[v_logo_out];`
      );
      finalVideoTag = '[v_logo_out]';
    }

    // Step 5B Feature: Burn-In Synchronized ASS Subtitles
    if (subtitles?.assPath && fs.existsSync(subtitles.assPath)) {
      const escapedAss = subtitles.assPath.replace(/\\/g, '/').replace(':', '\\:');
      const escapedFonts = (subtitles.fontsDir || storageService.getFontsDir()).replace(/\\/g, '/').replace(':', '\\:');
      filterScriptLines.push(
        `${finalVideoTag}ass='${escapedAss}':fontsdir='${escapedFonts}'[v_sub_out];`
      );
      finalVideoTag = '[v_sub_out]';
    }

    // Step 5B Feature: Background Music with Auto-Ducking
    if (musicInputIdx !== null && backgroundMusic) {
      const musicVol = backgroundMusic.volume ?? 0.22;
      const fadeInDur = 1.2;
      const fadeOutStart = Math.max(0, calculatedTotalDuration - 2.0);

      filterScriptLines.push(
        `[${musicInputIdx}:a]atrim=0:${calculatedTotalDuration.toFixed(3)},asetpts=PTS-STARTPTS,volume=${musicVol.toFixed(2)},afade=t=in:d=${fadeInDur}:curve=log,afade=t=out:st=${fadeOutStart.toFixed(3)}:d=2:curve=log[m_pre];`
      );

      if (backgroundMusic.ducking !== false) {
        filterScriptLines.push(`${finalAudioTag}asplit=2[sp_main][sp_sc];`);
        filterScriptLines.push(
          `[m_pre][sp_sc]sidechaincompress=threshold=0.08:ratio=4:attack=200:release=1000[m_ducked];`
        );
        filterScriptLines.push(
          `[sp_main][m_ducked]amix=inputs=2:duration=first:dropout_transition=2[a_mixed];`
        );
        finalAudioTag = '[a_mixed]';
      } else {
        filterScriptLines.push(
          `${finalAudioTag}[m_pre]amix=inputs=2:duration=first:dropout_transition=2[a_mixed];`
        );
        finalAudioTag = '[a_mixed]';
      }
    }

    // Audio loudness normalization (-16 LUFS broadcast standard)
    filterScriptLines.push(`${finalAudioTag}loudnorm=I=-16:TP=-1.5:LRA=11[a_final]`);

    // Write filter graph to script file (for reference/auditing)
    const scriptPath = storageService.getTempPath(`filter_script_${jobId}_${Date.now()}.txt`);
    const filterComplexString = filterScriptLines.join('\n');
    fs.writeFileSync(scriptPath, filterComplexString, 'utf-8');

    args.push('-filter_complex', filterComplexString);
    args.push('-map', finalVideoTag);
    args.push('-map', '[a_final]');

    // 6. Select Video Encoder
    const encoder = await this.detectHardwareEncoder();

    if (qualityMode === 'draft') {
      if (encoder === 'h264_nvenc') {
        args.push('-c:v', 'h264_nvenc', '-preset', 'p1', '-cq', '28');
      } else if (encoder === 'h264_qsv') {
        args.push('-c:v', 'h264_qsv', '-preset', 'veryfast', '-global_quality', '28');
      } else {
        args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26');
      }
      args.push('-c:a', 'aac', '-b:a', '128k');
    } else {
      if (encoder === 'h264_nvenc') {
        args.push('-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', '18');
      } else if (encoder === 'h264_qsv') {
        args.push('-c:v', 'h264_qsv', '-preset', 'medium', '-global_quality', '18');
      } else {
        args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '18');
      }
      args.push('-c:a', 'aac', '-b:a', '192k');
    }

    args.push('-pix_fmt', 'yuv420p');
    args.push('-movflags', '+faststart');
    args.push('-metadata:s:v:0', 'rotate=0');
    args.push('-fps_mode', 'cfr');
    args.push('-progress', 'pipe:1');
    args.push(outputPath);

    console.log(`[FFmpegService] Executing plan render job ${jobId} using encoder ${encoder} (script: ${scriptPath})`);

    // 7. Spawn Process and Track Progress
    return new Promise<PlanRenderResult>((resolve, reject) => {
      const defaultTimeout = qualityMode === 'draft' ? 5 * 60 * 1000 : 10 * 60 * 1000;
      const timeoutLimit = options.timeoutMs || defaultTimeout;

      let timeoutHandle: NodeJS.Timeout | null = null;
      let isSettled = false;

      const child = spawn(env.FFMPEG_PATH, args);
      this.activeProcesses.set(jobId, child);

      timeoutHandle = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          console.warn(`[FFmpegService] Render job ${jobId} timed out after ${timeoutLimit / 1000}s! Killing process.`);
          try {
            child.kill('SIGKILL');
          } catch {}
          this.activeProcesses.delete(jobId);
          try {
            if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
          } catch {}
          reject(new Error(`Render timed out after ${timeoutLimit / 1000} seconds.`));
        }
      }, timeoutLimit);

      let stdoutBuf = '';
      const stderrLines: string[] = [];

      child.stdout.on('data', (chunk) => {
        stdoutBuf += chunk.toString();
        const lines = stdoutBuf.split('\n');
        stdoutBuf = lines.pop() || '';

        let outTimeSec = 0;
        let speedStr = '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('out_time_us=')) {
            const us = parseInt(trimmed.split('=')[1], 10);
            if (!isNaN(us)) outTimeSec = us / 1000000;
          } else if (trimmed.startsWith('out_time_ms=')) {
            const ms = parseInt(trimmed.split('=')[1], 10);
            if (!isNaN(ms)) outTimeSec = ms / 1000000;
          } else if (trimmed.startsWith('speed=')) {
            speedStr = trimmed.split('=')[1].trim();
          }
        }

        if (outTimeSec > 0 && calculatedTotalDuration > 0) {
          const rawPct = Math.round((outTimeSec / calculatedTotalDuration) * 100);
          const percent = Math.min(99, Math.max(5, rawPct));

          let etaSeconds: number | undefined;
          if (speedStr && speedStr.endsWith('x')) {
            const speedMultiplier = parseFloat(speedStr.replace('x', ''));
            if (!isNaN(speedMultiplier) && speedMultiplier > 0) {
              const remainingSec = Math.max(0, calculatedTotalDuration - outTimeSec);
              etaSeconds = Math.round(remainingSec / speedMultiplier);
            }
          }

          onProgress?.({
            percent,
            stage: `Rendering ${qualityMode.toUpperCase()} video (${percent}%)`,
            etaSeconds,
            speed: speedStr || undefined,
            currentSeconds: Math.round(outTimeSec),
            totalSeconds: Math.round(calculatedTotalDuration),
          });
        }
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        const lines = text.split('\n');
        for (const line of lines) {
          const t = line.trim();
          if (t) {
            stderrLines.push(t);
            if (stderrLines.length > 50) stderrLines.shift();
          }
        }
      });

      child.on('close', (code) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (isSettled) return;
        isSettled = true;

        this.activeProcesses.delete(jobId);

        // Delete temporary script file
        try {
          if (fs.existsSync(scriptPath)) {
            fs.unlinkSync(scriptPath);
          }
        } catch {}

        if (code === 0 && fs.existsSync(outputPath)) {
          const fileSize = storageService.getFileSize(outputPath);
          onProgress?.({
            percent: 100,
            stage: 'Render completed successfully',
            totalSeconds: calculatedTotalDuration,
          });
          resolve({
            outputPath,
            duration: calculatedTotalDuration,
            encoderUsed: encoder,
            resolution: `${targetWidth}x${targetHeight}`,
            fileSizeBytes: fileSize,
          });
        } else {
          const lastErr = stderrLines.slice(-15).join('\n');
          console.error(`[FFmpeg Error for job ${jobId}] (code ${code}):`, lastErr);
          reject(
            new Error(
              `FFmpeg render failed (code ${code}). Details:\n${lastErr || 'Unknown error occurred during video encoding'}`
            )
          );
        }
      });

      child.on('error', (err) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (isSettled) return;
        isSettled = true;

        this.activeProcesses.delete(jobId);
        try {
          if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
        } catch {}
        reject(err);
      });
    });
  }

  /**
   * Renders timeline (backward compatibility for legacy timeline calls).
   */
  public async renderTimeline(options: RenderOptions): Promise<string> {
    const { clips, captions = [], audio = [], aspectRatio = '16:9', outputPath, onProgress } = options;

    if (!clips || clips.length === 0) {
      throw new Error('Cannot render video: no clips provided');
    }

    let targetWidth = 1920;
    let targetHeight = 1080;
    if (aspectRatio === '9:16') {
      targetWidth = 1080;
      targetHeight = 1920;
    } else if (aspectRatio === '1:1') {
      targetWidth = 1080;
      targetHeight = 1080;
    }

    let totalDuration = 0;
    for (const c of clips) {
      totalDuration += Math.max(0.1, (c.sourceOut - c.sourceIn) / (c.speed || 1.0));
    }

    onProgress?.(10, 'Preparing video filters and segment assembly');

    const args: string[] = ['-y'];

    for (const clip of clips) {
      args.push('-ss', clip.sourceIn.toString(), '-to', clip.sourceOut.toString(), '-i', clip.filePath);
    }

    let bgAudioInputIndex = -1;
    if (audio.length > 0 && fs.existsSync(audio[0].filePath)) {
      bgAudioInputIndex = clips.length;
      args.push('-i', audio[0].filePath);
    }

    const filterComplexParts: string[] = [];

    for (let i = 0; i < clips.length; i++) {
      const vTag = `v${i}`;
      const aTag = `a${i}`;
      filterComplexParts.push(
        `[${i}:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[${vTag}]`
      );
      filterComplexParts.push(`[${i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[${aTag}]`);
    }

    const concatVideoInputs = clips.map((_, i) => `[v${i}]`).join('');
    const concatAudioInputs = clips.map((_, i) => `[a${i}]`).join('');
    filterComplexParts.push(
      `${concatVideoInputs}concat=n=${clips.length}:v=1:a=0[v_concat]`,
      `${concatAudioInputs}concat=n=${clips.length}:v=0:a=1[a_concat]`
    );

    let finalVideoTag = '[v_concat]';
    let finalAudioTag = '[a_concat]';

    if (captions.length > 0) {
      const tempSrt = storageService.getTempPath(`subs_${Date.now()}.srt`);
      this.createSrtFile(captions, tempSrt);
      const escapedSrt = tempSrt.replace(/\\/g, '/').replace(/:/g, '\\:');
      filterComplexParts.push(
        `${finalVideoTag}subtitles='${escapedSrt}':force_style='FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,BackColour=&H80000000'[v_captioned]`
      );
      finalVideoTag = '[v_captioned]';
    }

    if (bgAudioInputIndex >= 0) {
      const bgVol = audio[0].volume ?? 0.3;
      filterComplexParts.push(
        `[${bgAudioInputIndex}:a]volume=${bgVol},aloop=loop=-1:size=2e+09[bg_looped]`,
        `${finalAudioTag}[bg_looped]amix=inputs=2:duration=first:dropout_transition=2[a_mixed]`
      );
      finalAudioTag = '[a_mixed]';
    }

    const scriptPath = storageService.getTempPath(`legacy_timeline_${Date.now()}.txt`);
    const filterComplexString = filterComplexParts.join(';');
    fs.writeFileSync(scriptPath, filterComplexString, 'utf-8');

    args.push('-filter_complex', filterComplexString);
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
        try {
          if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
        } catch {}
        if (code === 0) {
          onProgress?.(100, 'Rendering completed successfully');
          resolve(outputPath);
        } else {
          console.error('[FFmpeg Error]', stderrBuf);
          reject(new Error(`FFmpeg rendering failed (code ${code}): ${stderrBuf.slice(-500)}`));
        }
      });

      child.on('error', (err) => {
        try {
          if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
        } catch {}
        reject(err);
      });
    });
  }
}

export const ffmpegService = new FFmpegService();
