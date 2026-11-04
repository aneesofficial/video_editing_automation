import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/queue.js';
import { prisma } from '../config/database.js';
import { ffprobeService } from '../services/ffmpeg/ffprobe.service.js';
import { ffmpegService } from '../services/ffmpeg/ffmpeg.service.js';
import { pythonBridgeService } from '../services/python/python-bridge.service.js';
import { storageService } from '../services/storage/storage.service.js';
import { transcriptionQueue } from '../queues/index.js';

export interface AnalysisJobData {
  mediaAssetId: string;
}

export const analysisWorker = new Worker<AnalysisJobData>(
  'media-analysis',
  async (job: Job<AnalysisJobData>) => {
    const { mediaAssetId } = job.data;
    console.log(`[AnalysisWorker] Starting analysis for mediaAsset: ${mediaAssetId}`);

    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
      include: { project: true },
    });

    if (!mediaAsset) {
      throw new Error(`MediaAsset not found: ${mediaAssetId}`);
    }

    await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: { status: 'analyzing' },
    });

    try {
      // 1. FFprobe metadata
      await job.updateProgress(15);
      const probeResult = await ffprobeService.probeMedia(mediaAsset.storagePath);

      await prisma.videoMetadata.upsert({
        where: { mediaAssetId },
        create: {
          mediaAssetId,
          format: probeResult.format,
          duration: probeResult.duration,
          bitrate: probeResult.bitrate,
          videoCodec: probeResult.videoCodec,
          audioCodec: probeResult.audioCodec,
          width: probeResult.width,
          height: probeResult.height,
          aspectRatio: probeResult.aspectRatio,
          frameRate: probeResult.frameRate,
          audioChannels: probeResult.audioChannels,
          sampleRate: probeResult.sampleRate,
          rawMetadataJson: probeResult.rawJson,
        },
        update: {
          format: probeResult.format,
          duration: probeResult.duration,
          bitrate: probeResult.bitrate,
          videoCodec: probeResult.videoCodec,
          audioCodec: probeResult.audioCodec,
          width: probeResult.width,
          height: probeResult.height,
          aspectRatio: probeResult.aspectRatio,
          frameRate: probeResult.frameRate,
          audioChannels: probeResult.audioChannels,
          sampleRate: probeResult.sampleRate,
          rawMetadataJson: probeResult.rawJson,
        },
      });

      // Update mediaAsset duration and resolution
      await prisma.mediaAsset.update({
        where: { id: mediaAssetId },
        data: {
          durationSeconds: probeResult.duration,
          width: probeResult.width,
          height: probeResult.height,
          fps: probeResult.frameRate,
          codec: probeResult.videoCodec,
          hasAudio: !!probeResult.audioCodec,
          audioChannels: probeResult.audioChannels,
          audioSampleRate: probeResult.sampleRate,
        },
      });

      // 2. Generate video thumbnail
      await job.updateProgress(35);
      const thumbFilename = `thumb_${mediaAsset.id}.jpg`;
      const thumbPath = storageService.getThumbnailPath(thumbFilename);
      const thumbSeek = Math.min(1.0, Math.max(0.1, probeResult.duration / 4));
      
      try {
        await ffmpegService.generateThumbnail(mediaAsset.storagePath, thumbPath, thumbSeek);
        const thumbUrl = storageService.getPublicUrl(thumbPath);
        
        // Update project thumbnail if not set
        if (!mediaAsset.project.thumbnailUrl) {
          await prisma.project.update({
            where: { id: mediaAsset.projectId },
            data: {
              thumbnailUrl: thumbUrl,
              durationSeconds: probeResult.duration,
            },
          });
        }
      } catch (thumbErr) {
        console.warn(`[AnalysisWorker] Thumbnail generation non-fatal error:`, thumbErr);
      }

      // 3. Scene Detection with PySceneDetect
      await job.updateProgress(55);
      console.log(`[AnalysisWorker] Running PySceneDetect for ${mediaAsset.filename}...`);
      const detectedScenes = await pythonBridgeService.detectScenes(mediaAsset.storagePath);

      // Clear any prior scenes for this asset and reinsert
      await prisma.detectedScene.deleteMany({ where: { mediaAssetId } });

      for (const scene of detectedScenes) {
        await prisma.detectedScene.create({
          data: {
            mediaAssetId,
            sceneIndex: scene.scene_index,
            startTime: scene.start_time,
            endTime: scene.end_time,
            duration: scene.duration,
            cutType: scene.cut_type,
            score: scene.score,
          },
        });
      }

      await job.updateProgress(85);

      // 4. Mark analyzed
      await prisma.mediaAsset.update({
        where: { id: mediaAssetId },
        data: { status: 'analyzed' },
      });

      // 5. Enqueue transcription if asset has audio
      if (probeResult.audioCodec) {
        await transcriptionQueue.add('transcribe', { mediaAssetId });
      }

      await job.updateProgress(100);
      console.log(`[AnalysisWorker] Analysis complete for mediaAsset: ${mediaAssetId} (${detectedScenes.length} scenes)`);
    } catch (err) {
      console.error(`[AnalysisWorker] Error analyzing mediaAsset ${mediaAssetId}:`, err);
      await prisma.mediaAsset.update({
        where: { id: mediaAssetId },
        data: { status: 'error' },
      });
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

