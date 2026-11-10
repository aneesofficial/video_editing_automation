import fs from 'node:fs';
import path from 'node:path';
import { Worker, Job } from '../queues/in-memory-queue.js';
import { prisma } from '../config/database.js';
import {
  ffmpegService,
  PlanRenderSegment,
  SubtitleBurnOptions,
  BrandWatermarkOptions,
  BackgroundMusicOptions,
} from '../services/ffmpeg/ffmpeg.service.js';
import {
  subtitleService,
  SubtitleClipMapping,
  AssetTranscriptData,
  SubtitleStyle,
} from '../services/ffmpeg/subtitle.service.js';
import { brandService } from '../services/brand/brand.service.js';
import { musicService } from '../services/music/music.service.js';
import { pythonBridgeService } from '../services/python/python-bridge.service.js';
import { ffprobeService } from '../services/ffmpeg/ffprobe.service.js';
import { storageService, sanitizeWindowsName } from '../services/storage/storage.service.js';

export interface RenderJobData {
  renderingJobId: string;
  mode?: 'draft' | 'final';
  planVersion?: string;
  options?: {
    captions?: boolean;
    captionStyle?: 'viral' | 'clean' | 'minimal';
    music?: boolean;
    musicMood?: string;
    useBrandKit?: boolean;
    silenceRemoval?: boolean;
    bRollEnabled?: boolean;
    excludedBRollIds?: string[];
  };
}

function isPhotoMedia(filename: string, mimeType?: string): boolean {
  if (mimeType && mimeType.startsWith('image/')) return true;
  const ext = path.extname(filename || '').toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].includes(ext);
}

export const renderWorker = new Worker<RenderJobData>(
  'video-rendering',
  async (job: Job<RenderJobData>) => {
    const { renderingJobId, mode = 'draft', planVersion, options: renderOptions } = job.data;
    const qualityMode: 'draft' | 'final' = mode === 'final' ? 'final' : 'draft';

    console.log(
      `[RenderWorker] Starting rendering job ${renderingJobId} (mode: ${qualityMode}, plan: ${planVersion || 'latest'})`
    );

    const renderingJob = await prisma.renderingJob.findUnique({
      where: { id: renderingJobId },
      include: {
        project: {
          include: {
            client: true,
            mediaAssets: {
              include: { metadata: true },
            },
            editingPlans: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!renderingJob) {
      throw new Error(`RenderingJob not found: ${renderingJobId}`);
    }

    const project = renderingJob.project;
    const clientName = project.client?.name || 'General';

    // Helper to log job events and update progress
    const logEvent = async (stage: string, progress: number, message: string, details?: any) => {
      try {
        await prisma.jobEvent.create({
          data: {
            renderingJobId,
            stage,
            progress,
            message,
            detailsJson: details ? JSON.stringify(details) : null,
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
      } catch (e) {
        console.warn('[RenderWorker] Failed to write jobEvent:', e);
      }
    };

    try {
      await prisma.renderingJob.update({
        where: { id: renderingJobId },
        data: {
          status: 'processing',
          jobType: qualityMode,
          startedAt: new Date(),
        },
      });

      await logEvent('Initialization', 5, `Locating Gemini plan and resolving raw media assets`);

      // 1. Locate Plan (from disk storage or DB)
      const diskPlans = storageService.listPlanJsons(clientName, project.title);
      let activePlanData: any = null;
      let activePlanVersionTag = planVersion || (diskPlans.length > 0 ? diskPlans[0].version : 'v1');

      if (planVersion) {
        const found = diskPlans.find((p) => p.version.toLowerCase() === planVersion.toLowerCase());
        if (found) {
          activePlanData = found.data?.plan;
          activePlanVersionTag = found.version;
        }
      }

      if (!activePlanData && diskPlans.length > 0) {
        activePlanData = diskPlans[0].data?.plan;
        activePlanVersionTag = diskPlans[0].version;
      }

      if (!activePlanData && project.editingPlans.length > 0) {
        const dbPlan = project.editingPlans[0];
        activePlanData = {
          summary: dbPlan.summary,
          explanation: dbPlan.rationale,
          targetDurationSeconds: dbPlan.targetDurationSeconds,
          frame: {
            platform: project.targetPlatform || 'YouTube 16:9',
            aspectRatio: project.aspectRatio || '16:9',
            resolution: project.resolution || '1920x1080',
          },
          segments: JSON.parse(dbPlan.selectedScenesJson || '[]'),
        };
      }

      // Feature settings & overrides from Result Screen
      const overrides = renderOptions || {};
      const captionsEnabled =
        overrides.captions !== undefined
          ? overrides.captions
          : activePlanData?.captions !== undefined
          ? activePlanData.captions.length > 0
          : true;
      const captionStyle: SubtitleStyle = overrides.captionStyle || 'viral';
      const musicEnabled =
        overrides.music !== undefined
          ? overrides.music
          : (activePlanData?.audio?.musicEnabled ?? false);
      const musicMood = overrides.musicMood || activePlanData?.audio?.mood || 'upbeat';
      const musicVolume = activePlanData?.audio?.volume ?? 0.22;
      const musicDucking = activePlanData?.audio?.ducking !== false;
      const useBrandKit = overrides.useBrandKit !== undefined ? overrides.useBrandKit : true;
      const silenceRemovalEnabled =
        overrides.silenceRemoval !== undefined
          ? overrides.silenceRemoval
          : (activePlanData?.silenceRemoval?.enabled ?? true);

      // 2. Resolve Plan Segments to Raw Media Files
      const rawSegments: PlanRenderSegment[] = [];

      if (activePlanData && activePlanData.segments && activePlanData.segments.length > 0) {
        for (const seg of activePlanData.segments) {
          const asset = project.mediaAssets.find((a: any) => a.id === seg.assetId);
          if (asset && storageService.fileExists(asset.storagePath)) {
            const isPhoto = asset.isPhoto || isPhotoMedia(asset.originalName || asset.filename, asset.mimeType);
            const isHdr =
              !!asset.metadata?.rawMetadataJson &&
              (asset.metadata.rawMetadataJson.includes('arib-std-b67') ||
                asset.metadata.rawMetadataJson.includes('smpte2084') ||
                asset.metadata.rawMetadataJson.includes('bt2020'));

            let hasAudio = false;
            if (!isPhoto) {
              try {
                const probe = await ffprobeService.probeMedia(asset.storagePath);
                hasAudio = !!probe.audioCodec;
              } catch {
                hasAudio = !!asset.hasAudio;
              }
            }

            rawSegments.push({
              assetId: asset.id,
              filePath: asset.storagePath,
              isPhoto,
              sourceIn: seg.sourceIn || 0,
              sourceOut: seg.sourceOut || (isPhoto ? 5.0 : asset.durationSeconds || 10.0),
              speed: seg.speed || 1.0,
              transition: seg.transition || 'cut',
              motionEffect: seg.motionEffect || 'none',
              hasAudio,
              isHdr,
            });
          }
        }
      }

      // Fallback: If no plan was generated yet, synthesize default segments from uploaded raw media
      if (rawSegments.length === 0) {
        for (const asset of project.mediaAssets) {
          if (storageService.fileExists(asset.storagePath)) {
            const isPhoto = asset.isPhoto || isPhotoMedia(asset.originalName || asset.filename, asset.mimeType);
            let hasAudio = false;
            if (!isPhoto) {
              try {
                const probe = await ffprobeService.probeMedia(asset.storagePath);
                hasAudio = !!probe.audioCodec;
              } catch {
                hasAudio = !!asset.hasAudio;
              }
            }
            rawSegments.push({
              assetId: asset.id,
              filePath: asset.storagePath,
              isPhoto,
              sourceIn: 0,
              sourceOut: isPhoto ? 5.0 : asset.durationSeconds || 10.0,
              speed: 1.0,
              transition: 'cut',
              motionEffect: isPhoto ? 'ken_burns' : 'none',
              hasAudio,
            });
          }
        }
      }

      if (rawSegments.length === 0) {
        throw new Error('No valid media assets found in project raw folder to render');
      }

      // 3. Step 5B Feature: Silence Removal Pass
      const finalSegments: PlanRenderSegment[] = [];
      const removedSilencesByAsset = new Map<string, Array<{ start: number; end: number }>>();

      if (silenceRemovalEnabled) {
        await logEvent('SilenceRemoval', 8, 'Analyzing speech tracks for silence gaps (min 0.4s)');
        for (const seg of rawSegments) {
          if (!seg.isPhoto && seg.hasAudio) {
            try {
              const detected = await pythonBridgeService.detectSilence(seg.filePath, -30.0, 0.4);
              const validCuts: Array<{ start: number; end: number }> = [];

              for (const s of detected) {
                // Apply 0.05s safety margins to preserve word boundaries
                const cutStart = Math.max(seg.sourceIn, s.start + 0.05);
                const cutEnd = Math.min(seg.sourceOut, s.end - 0.05);
                if (cutEnd - cutStart >= 0.2) {
                  validCuts.push({ start: cutStart, end: cutEnd });
                }
              }

              if (validCuts.length > 0) {
                removedSilencesByAsset.set(seg.assetId, validCuts);
                let curIn = seg.sourceIn;
                for (const cut of validCuts) {
                  if (cut.start > curIn + 0.1) {
                    finalSegments.push({
                      ...seg,
                      sourceIn: curIn,
                      sourceOut: cut.start,
                    });
                  }
                  curIn = cut.end;
                }
                if (seg.sourceOut > curIn + 0.1) {
                  finalSegments.push({
                    ...seg,
                    sourceIn: curIn,
                    sourceOut: seg.sourceOut,
                  });
                }
              } else {
                finalSegments.push(seg);
              }
            } catch (silErr) {
              console.warn('[RenderWorker] Silence detection non-fatal warning:', silErr);
              finalSegments.push(seg);
            }
          } else {
            finalSegments.push(seg);
          }
        }
      } else {
        finalSegments.push(...rawSegments);
      }

      const framePlatform = activePlanData?.frame?.platform || project.targetPlatform || 'YouTube 16:9';
      const frameAspectRatio = activePlanData?.frame?.aspectRatio || project.aspectRatio || '16:9';
      const frameResolution = activePlanData?.frame?.resolution || project.resolution || '1920x1080';

      // 4. Calculate output dimensions
      let origWidth = 1920;
      let origHeight = 1080;
      if (frameResolution && frameResolution.includes('x')) {
        const parts = frameResolution.split('x').map((n: string) => parseInt(n, 10));
        if (!isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
          origWidth = parts[0];
          origHeight = parts[1];
        }
      } else if (frameAspectRatio === '9:16') {
        origWidth = 1080;
        origHeight = 1920;
      }
      let targetWidth = qualityMode === 'draft' ? (origWidth >= origHeight ? 1280 : 720) : origWidth;
      let targetHeight = qualityMode === 'draft' ? (origWidth >= origHeight ? 720 : 1280) : origHeight;
      targetWidth = Math.trunc(targetWidth / 2) * 2;
      targetHeight = Math.trunc(targetHeight / 2) * 2;

      // 5. Determine Output Version Directory & File Path
      const { versionNumber, versionTag, versionDir } = storageService.getNextExportVersion(
        clientName,
        project.title
      );
      const safeProjectName = sanitizeWindowsName(project.title);
      const exportFilename = `${safeProjectName}_${versionTag}_${qualityMode}.mp4`;
      const exportPath = path.join(versionDir, exportFilename);

      // 6. Step 5B Feature: Brand Kit & Watermark Setup
      let brandWatermarkOptions: BrandWatermarkOptions | undefined = undefined;
      let brandPrimaryColor = '#FFDE59'; // default gold for viral captions

      if (useBrandKit) {
        try {
          const brandKit = brandService.getBrandKit();
          if (brandKit.primaryColor) {
            brandPrimaryColor = brandKit.primaryColor;
          }
          if (brandKit.logoPath && fs.existsSync(brandKit.logoPath)) {
            brandWatermarkOptions = {
              logoPath: brandKit.logoPath,
              position: brandKit.watermarkPosition,
              opacityPercent: brandKit.watermarkOpacity,
              sizePercent: brandKit.watermarkSizePercent,
            };
          }
        } catch (bErr) {
          console.warn('[RenderWorker] Brand kit lookup error:', bErr);
        }
      }

      // 7. Step 5B Feature: Background Music with Auto-Ducking Setup
      let backgroundMusicOptions: BackgroundMusicOptions | undefined = undefined;
      if (musicEnabled) {
        try {
          const track = await musicService.findTrackByMood(musicMood);
          if (track && fs.existsSync(track.storagePath)) {
            backgroundMusicOptions = {
              trackPath: track.storagePath,
              volume: musicVolume,
              ducking: musicDucking,
            };
            console.log(`[RenderWorker] Selected background music track '${track.title}' (mood: ${musicMood})`);
          } else {
            console.log(`[RenderWorker] No music track found in library for mood '${musicMood}'; rendering without music`);
          }
        } catch (mErr) {
          console.warn('[RenderWorker] Music track selection error:', mErr);
        }
      }

      // 8. Step 5B Feature: Subtitle Synchronization & ASS Generation
      const clipMappings: SubtitleClipMapping[] = [];
      let currentTimelineTime = 0;
      for (let i = 0; i < finalSegments.length; i++) {
        const seg = finalSegments[i];
        let dur = (seg.sourceOut - seg.sourceIn) / (seg.speed || 1.0);
        if (seg.isPhoto) {
          dur = Math.max(1.0, seg.sourceOut - seg.sourceIn);
        }
        let timelineStart = currentTimelineTime;
        if (i > 0 && seg.transition && seg.transition !== 'cut') {
          const transDur = Math.min(0.5, dur * 0.4);
          timelineStart = Math.max(0, currentTimelineTime - transDur);
        }
        clipMappings.push({
          assetId: seg.assetId,
          sourceIn: seg.sourceIn,
          sourceOut: seg.sourceOut,
          speed: seg.speed || 1.0,
          timelineStart,
          timelineDuration: dur,
          removedSilences: removedSilencesByAsset.get(seg.assetId) || [],
        });
        currentTimelineTime = timelineStart + dur;
      }

      const uniqueAssetIds = Array.from(new Set(finalSegments.map((s) => s.assetId)));
      const transcriptsByAssetId = new Map<string, AssetTranscriptData>();

      for (const assetId of uniqueAssetIds) {
        try {
          const trans = await prisma.transcription.findUnique({
            where: { mediaAssetId: assetId },
            include: { segments: true },
          });
          if (trans && trans.segments.length > 0) {
            transcriptsByAssetId.set(assetId, {
              language: trans.language,
              segments: trans.segments.map((s: any) => {
                let words: any[] = [];
                try {
                  words = s.wordsJson ? JSON.parse(s.wordsJson) : [];
                } catch {
                  words = [];
                }
                return {
                  start: s.startTime,
                  end: s.endTime,
                  text: s.text,
                  words,
                };
              }),
            });
          }
        } catch (trErr) {
          console.warn('[RenderWorker] Failed to query transcription for asset:', assetId, trErr);
        }
      }

      const assFilename = `${safeProjectName}_${versionTag}_${qualityMode}.ass`;
      const assPath = path.join(versionDir, assFilename);
      let subtitleBurnOptions: SubtitleBurnOptions | undefined = undefined;

      try {
        subtitleService.generateAssFile({
          outputPath: assPath,
          targetWidth,
          targetHeight,
          aspectRatio: frameAspectRatio,
          style: captionStyle,
          highlightColorHex: brandPrimaryColor,
          clipMappings,
          transcriptsByAssetId,
          textOverlays: activePlanData?.textOverlays || [],
          fontsDir: storageService.getFontsDir(),
        });

        if (captionsEnabled && fs.existsSync(assPath)) {
          subtitleBurnOptions = {
            assPath,
            fontsDir: storageService.getFontsDir(),
          };
        }
      } catch (assErr) {
        console.warn('[RenderWorker] Subtitle generation warning:', assErr);
      }

      await logEvent(
        'Encoding',
        10,
        `Starting FFmpeg ${qualityMode.toUpperCase()} render (${framePlatform}) as ${versionTag}`
      );

      // Step 8 Feature: Auto B-Roll Cutaway Resolution
      const bRollCutaways: any[] = [];
      const bRollEnabled = renderOptions?.bRollEnabled !== false;
      const excludedIds = new Set(renderOptions?.excludedBRollIds || []);

      const rawBRolls = activePlanData?.bRollSegments || activePlanData?.plan?.bRollSegments || [];
      if (bRollEnabled && Array.isArray(rawBRolls)) {
        for (const br of rawBRolls) {
          if (br.removed || (br.id && excludedIds.has(br.id))) continue;

          let targetFilePath = br.filePath;
          let isPhoto = Boolean(br.isPhoto);

          if (!targetFilePath && br.assetId) {
            const matchAsset = project.mediaAssets.find((a: any) => a.id === br.assetId);
            if (matchAsset && fs.existsSync(matchAsset.storagePath)) {
              targetFilePath = matchAsset.storagePath;
              isPhoto = isPhotoMedia(matchAsset.originalName || matchAsset.filename, matchAsset.mimeType);
            }
          }

          if (targetFilePath && fs.existsSync(targetFilePath)) {
            bRollCutaways.push({
              id: br.id,
              filePath: targetFilePath,
              isPhoto,
              startTime: br.startTime,
              duration: br.duration,
            });
          }
        }
      }

      // 9. Execute Autonomous Render via FFmpegService
      const renderResult = await ffmpegService.renderPlan({
        jobId: renderingJobId,
        segments: finalSegments,
        frame: {
          platform: framePlatform,
          aspectRatio: frameAspectRatio,
          resolution: frameResolution,
        },
        qualityMode,
        outputPath: exportPath,
        subtitles: subtitleBurnOptions,
        brandWatermark: brandWatermarkOptions,
        backgroundMusic: backgroundMusicOptions,
        bRollCutaways: bRollCutaways.length > 0 ? bRollCutaways : undefined,
        onProgress: async (p) => {
          let msg = `Rendering video (${p.percent}%)`;
          if (p.etaSeconds !== undefined) {
            msg += ` (ETA ~${p.etaSeconds}s)`;
          }
          await logEvent('Encoding', p.percent, msg, {
            etaSeconds: p.etaSeconds,
            speed: p.speed,
            currentSeconds: p.currentSeconds,
            totalSeconds: p.totalSeconds,
          });
        },
      });

      await logEvent('Finalizing', 95, 'Verifying video stream integrity and generating thumbnail');

      // 10. Generate Thumbnail
      const thumbFilename = `thumb_${versionTag}_${Date.now()}.jpg`;
      const thumbPath = storageService.getThumbnailPath(thumbFilename);
      let thumbUrl: string | null = null;
      try {
        await ffmpegService.generateThumbnail(exportPath, thumbPath, 0.5);
        thumbUrl = `/storage/thumbnails/${thumbFilename}`;
      } catch (thErr) {
        console.warn('[RenderWorker] Thumbnail generation failed:', thErr);
      }

      // 11. Probe Final Output
      const probeExport = await ffprobeService.probeMedia(exportPath);
      const publicUrl = storageService.getPublicUrl(exportPath);

      // 12. Save to Database (ExportedFile & ProjectVersion)
      const exportedFile = await prisma.exportedFile.create({
        data: {
          projectId: project.id,
          renderingJobId,
          versionTag,
          versionNumber,
          filename: exportFilename,
          mimeType: 'video/mp4',
          fileSizeBytes: renderResult.fileSizeBytes,
          storagePath: exportPath,
          publicUrl,
          width: probeExport.width || parseInt(renderResult.resolution.split('x')[0], 10),
          height: probeExport.height || parseInt(renderResult.resolution.split('x')[1], 10),
          duration: probeExport.duration || renderResult.duration,
          resolution: renderResult.resolution,
          format: 'mp4',
        },
      });

      const featureBadges: string[] = [];
      if (subtitleBurnOptions) featureBadges.push(`Captions: ${captionStyle}`);
      if (backgroundMusicOptions) featureBadges.push(`Music: ${musicMood}`);
      if (brandWatermarkOptions) featureBadges.push('Watermark');
      if (silenceRemovalEnabled) featureBadges.push('Silence Cut');
      const featuresStr = featureBadges.length > 0 ? ` • [${featureBadges.join(', ')}]` : '';

      const qualityBadgeText = `${qualityMode.toUpperCase()} (${renderResult.resolution}) • Version ${activePlanVersionTag}${featuresStr}`;

      await prisma.projectVersion.create({
        data: {
          projectId: project.id,
          versionNumber,
          versionTag,
          filename: exportFilename,
          storagePath: exportPath,
          publicUrl,
          fileSizeBytes: renderResult.fileSizeBytes,
          duration: probeExport.duration || renderResult.duration,
          resolution: renderResult.resolution,
          format: 'mp4',
          notes: qualityBadgeText,
          exportedFileId: exportedFile.id,
        },
      });

      // 13. Update project.json on disk
      storageService.saveProjectJson(clientName, project.title, {
        id: project.id,
        title: project.title,
        client: clientName,
        latestExportVersion: versionTag,
        latestExportFile: exportFilename,
        latestExportMode: qualityMode,
        latestExportUrl: publicUrl,
        latestExportThumbnail: thumbUrl,
        latestExportAssFile: fs.existsSync(assPath) ? storageService.getPublicUrl(assPath) : null,
        features: featureBadges,
        updatedAt: new Date().toISOString(),
      });

      await logEvent(
        'Complete',
        100,
        `Video successfully rendered as ${versionTag} (${qualityMode.toUpperCase()}, ${renderResult.fileSizeBytes} bytes)`
      );

      // 14. Update RenderingJob
      await prisma.renderingJob.update({
        where: { id: renderingJobId },
        data: {
          status: 'completed',
          progressPercent: 100,
          currentStage: 'Completed',
          completedAt: new Date(),
        },
      });

      console.log(
        `[RenderWorker] Render job ${renderingJobId} completed! File: ${exportPath} (${renderResult.fileSizeBytes} bytes)`
      );
    } catch (err: any) {
      console.error(`[RenderWorker] Render job ${renderingJobId} failed:`, err);
      const errorMsg = err?.message || 'Video rendering failed';

      await logEvent('Error', 0, `Rendering error: ${errorMsg}`);

      await prisma.renderingJob.update({
        where: { id: renderingJobId },
        data: {
          status: 'failed',
          errorMessage: errorMsg,
          currentStage: 'Failed',
          completedAt: new Date(),
        },
      });

      throw err;
    }
  },
  {
    concurrency: 1, // Render concurrency 1 ensures full CPU/GPU bandwidth per job
  }
);
