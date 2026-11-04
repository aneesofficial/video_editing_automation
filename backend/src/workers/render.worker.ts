import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/queue.js';
import { prisma } from '../config/database.js';
import { ffmpegService, RenderClip, RenderCaption, RenderAudio } from '../services/ffmpeg/ffmpeg.service.js';
import { ffprobeService } from '../services/ffmpeg/ffprobe.service.js';
import { storageService } from '../services/storage/storage.service.js';

export interface RenderJobData {
  renderingJobId: string;
}

export const renderWorker = new Worker<RenderJobData>(
  'video-rendering',
  async (job: Job<RenderJobData>) => {
    const { renderingJobId } = job.data;
    console.log(`[RenderWorker] Starting rendering job: ${renderingJobId}`);

    const renderingJob = await prisma.renderingJob.findUnique({
      where: { id: renderingJobId },
      include: {
        project: {
          include: {
            timelineTracks: {
              include: {
                clips: {
                  include: { mediaAsset: true },
                  orderBy: { clipOrder: 'asc' },
                },
                captions: { orderBy: { startTime: 'asc' } },
                audios: true,
              },
              orderBy: { trackIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!renderingJob) {
      throw new Error(`RenderingJob not found: ${renderingJobId}`);
    }

    const project = renderingJob.project;

    // Helper to log job events
    const logEvent = async (stage: string, progress: number, message: string) => {
      await prisma.jobEvent.create({
        data: {
          renderingJobId,
          stage,
          progress,
          message,
        },
      });
      await prisma.renderingJob.update({
        where: { id: renderingJobId },
        data: {
          currentStage: stage,
          progressPercent: progress,
        },
      });
      await job.updateProgress(progress);
    };

    try {
      await prisma.renderingJob.update({
        where: { id: renderingJobId },
        data: {
          status: 'processing',
          startedAt: new Date(),
        },
      });

      await logEvent('Initialization', 5, 'Collecting timeline tracks and media assets');

      // 1. Collect video clips
      const videoTrack = project.timelineTracks.find((t) => t.trackType === 'video');
      const clips: RenderClip[] = [];

      if (videoTrack && videoTrack.clips.length > 0) {
        for (const clip of videoTrack.clips) {
          if (clip.mediaAsset && storageService.fileExists(clip.mediaAsset.storagePath)) {
            clips.push({
              filePath: clip.mediaAsset.storagePath,
              sourceIn: clip.sourceIn,
              sourceOut: clip.sourceOut,
              speed: clip.speed,
              volume: clip.volume,
            });
          }
        }
      }

      // If no clips configured on track, fall back to project's first media asset
      if (clips.length === 0) {
        const firstAsset = await prisma.mediaAsset.findFirst({
          where: { projectId: project.id },
        });

        if (!firstAsset || !storageService.fileExists(firstAsset.storagePath)) {
          throw new Error('No valid media files found for this project to render');
        }

        const dur = firstAsset.durationSeconds || 10;
        clips.push({
          filePath: firstAsset.storagePath,
          sourceIn: 0,
          sourceOut: dur,
        });
      }

      // 2. Collect captions
      const captionTrack = project.timelineTracks.find((t) => t.trackType === 'caption');
      const captions: RenderCaption[] = [];
      if (captionTrack && captionTrack.captions.length > 0) {
        for (const cap of captionTrack.captions) {
          captions.push({
            startTime: cap.startTime,
            endTime: cap.endTime,
            text: cap.text,
          });
        }
      }

      // 3. Collect audio
      const audioTrack = project.timelineTracks.find((t) => t.trackType === 'audio');
      const audio: RenderAudio[] = [];
      if (audioTrack && audioTrack.audios.length > 0) {
        for (const aud of audioTrack.audios) {
          if (storageService.fileExists(aud.storagePath)) {
            audio.push({
              filePath: aud.storagePath,
              startTime: aud.startTime,
              duration: aud.duration,
              volume: aud.volume,
            });
          }
        }
      }

      await logEvent('Composition', 15, `Synthesizing ${clips.length} clip segments and effects`);

      // 4. Output filename & path
      const exportFilename = `export_${project.id}_${Date.now()}.mp4`;
      const exportPath = storageService.getExportPath(exportFilename);

      await logEvent('Encoding', 25, 'Starting high-fidelity FFmpeg hardware/software encoding');

      // 5. Execute FFmpeg rendering
      await ffmpegService.renderTimeline({
        clips,
        captions,
        audio,
        aspectRatio: project.aspectRatio,
        resolution: project.resolution,
        outputPath: exportPath,
        onProgress: async (pct, msg) => {
          await logEvent('Encoding', pct, msg);
        },
      });

      await logEvent('Finalizing', 95, 'Probing exported output and calculating container metadata');

      // 6. Verify exported file with FFprobe
      const probeExport = await ffprobeService.probeMedia(exportPath);
      const fileSize = storageService.getFileSize(exportPath);
      const publicUrl = storageService.getPublicUrl(exportPath);

      // 7. Save ExportedFile record
      await prisma.exportedFile.create({
        data: {
          projectId: project.id,
          renderingJobId,
          filename: exportFilename,
          mimeType: 'video/mp4',
          fileSizeBytes: fileSize,
          storagePath: exportPath,
          publicUrl,
          width: probeExport.width,
          height: probeExport.height,
          duration: probeExport.duration,
          resolution: project.resolution,
          format: 'mp4',
        },
      });

      await logEvent('Complete', 100, `Video successfully rendered (${fileSize} bytes)`);

      // 8. Update job completion
      await prisma.renderingJob.update({
        where: { id: renderingJobId },
        data: {
          status: 'completed',
          progressPercent: 100,
          currentStage: 'Completed',
          completedAt: new Date(),
        },
      });

      console.log(`[RenderWorker] Render job ${renderingJobId} completed! File: ${exportPath}`);
    } catch (err) {
      console.error(`[RenderWorker] Rendering failed for job ${renderingJobId}:`, err);
      const errorMsg = (err as Error).message;

      await logEvent('Error', 0, `Rendering error: ${errorMsg}`);

      await prisma.renderingJob.update({
        where: { id: renderingJobId },
        data: {
          status: 'failed',
          errorMessage: errorMsg,
          completedAt: new Date(),
        },
      });
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // FFmpeg render takes CPU threads, concurrency 1 prevents CPU exhaustion
  }
);
