import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { env } from '../../config/env.js';

const execFileAsync = promisify(execFile);

export interface VideoMetadataResult {
  format: string;
  duration: number;
  bitrate?: number;
  videoCodec?: string;
  audioCodec?: string;
  width: number;
  height: number;
  aspectRatio: string;
  frameRate: number;
  audioChannels?: number;
  sampleRate?: number;
  rawJson: string;
}

export class FFprobeService {
  public async probeMedia(filePath: string): Promise<VideoMetadataResult> {
    try {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ];

      const { stdout } = await execFileAsync(env.FFPROBE_PATH, args, { maxBuffer: 10 * 1024 * 1024 });
      const data = JSON.parse(stdout);

      const videoStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === 'video');
      const audioStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === 'audio');
      const format = data.format || {};

      const duration = parseFloat(format.duration || videoStream?.duration || '0');
      const bitrate = format.bit_rate ? parseInt(format.bit_rate, 10) : undefined;
      const width = videoStream?.width || 1920;
      const height = videoStream?.height || 1080;

      // Calculate framerate from r_frame_rate e.g. "30/1" or "2997/100"
      let frameRate = 30;
      if (videoStream?.r_frame_rate) {
        const parts = videoStream.r_frame_rate.split('/');
        if (parts.length === 2 && parseInt(parts[1], 10) > 0) {
          frameRate = Math.round((parseInt(parts[0], 10) / parseInt(parts[1], 10)) * 100) / 100;
        }
      }

      // Aspect ratio calculation
      let aspectRatio = '16:9';
      if (width && height) {
        const ratio = width / height;
        if (Math.abs(ratio - 16 / 9) < 0.05) aspectRatio = '16:9';
        else if (Math.abs(ratio - 9 / 16) < 0.05) aspectRatio = '9:16';
        else if (Math.abs(ratio - 1) < 0.05) aspectRatio = '1:1';
        else if (Math.abs(ratio - 4 / 5) < 0.05) aspectRatio = '4:5';
        else aspectRatio = `${width}:${height}`;
      }

      return {
        format: format.format_name || 'mp4',
        duration: Math.round(duration * 1000) / 1000,
        bitrate,
        videoCodec: videoStream?.codec_name,
        audioCodec: audioStream?.codec_name,
        width,
        height,
        aspectRatio,
        frameRate,
        audioChannels: audioStream?.channels,
        sampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate, 10) : undefined,
        rawJson: JSON.stringify(data)
      };
    } catch (err) {
      console.error('[FFprobeService] Error probing file:', filePath, err);
      throw new Error(`Failed to probe video file: ${(err as Error).message}`);
    }
  }
}

export const ffprobeService = new FFprobeService();

