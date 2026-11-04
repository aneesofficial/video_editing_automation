import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { prisma } from '../src/config/database.js';
import { storageService } from '../src/services/storage/storage.service.js';
import { ffprobeService } from '../src/services/ffmpeg/ffprobe.service.js';
import { ffmpegService } from '../src/services/ffmpeg/ffmpeg.service.js';
import { pythonBridgeService } from '../src/services/python/python-bridge.service.js';
import { aiDirectorService } from '../src/services/ollama/ai-director.service.js';

describe('End-to-End Autonomous Video Editing Pipeline Verification', () => {
  let projectId: string;
  let mediaAssetId: string;
  const sampleSource = path.resolve(process.cwd(), 'storage/temp/test_sample.mp4');

  beforeAll(async () => {
    // 1. Create target project
    const project = await prisma.project.create({
      data: {
        title: 'Complete Autonomous E2E Production',
        description: 'End-to-end pipeline verification test',
        targetPlatform: 'youtube',
        aspectRatio: '16:9',
        resolution: '1080p',
      },
    });
    projectId = project.id;

    // 2. Ingest raw media file into storage
    const uploadFilename = `e2e_${Date.now()}_test.mp4`;
    const targetUploadPath = storageService.getUploadPath(uploadFilename);
    fs.copyFileSync(sampleSource, targetUploadPath);

    const asset = await prisma.mediaAsset.create({
      data: {
        projectId,
        filename: uploadFilename,
        originalName: 'test_sample.mp4',
        mimeType: 'video/mp4',
        fileSizeBytes: fs.statSync(targetUploadPath).size,
        storagePath: targetUploadPath,
        status: 'uploaded',
      },
    });
    mediaAssetId = asset.id;
  });

  afterAll(async () => {
    if (projectId) {
      await prisma.project.delete({ where: { id: projectId } });
    }
  });

  it('Step 1: Analyzes video file, extracts metadata and detects scenes', async () => {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
    expect(asset).toBeDefined();

    // Probe
    const probe = await ffprobeService.probeMedia(asset!.storagePath);
    expect(probe.duration).toBeGreaterThan(0);

    // Save metadata
    await prisma.videoMetadata.create({
      data: {
        mediaAssetId,
        format: probe.format,
        duration: probe.duration,
        bitrate: probe.bitrate,
        videoCodec: probe.videoCodec,
        audioCodec: probe.audioCodec,
        width: probe.width,
        height: probe.height,
        aspectRatio: probe.aspectRatio,
        frameRate: probe.frameRate,
      },
    });

    // Detect scenes
    const scenes = await pythonBridgeService.detectScenes(asset!.storagePath);
    expect(scenes.length).toBeGreaterThanOrEqual(1);

    for (const sc of scenes) {
      await prisma.detectedScene.create({
        data: {
          mediaAssetId,
          sceneIndex: sc.scene_index,
          startTime: sc.start_time,
          endTime: sc.end_time,
          duration: sc.duration,
          cutType: sc.cut_type,
        },
      });
    }

    await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: { status: 'analyzed', durationSeconds: probe.duration },
    });

    const updatedAsset = await prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
      include: { metadata: true, scenes: true },
    });

    expect(updatedAsset?.status).toBe('analyzed');
    expect(updatedAsset?.scenes.length).toBeGreaterThanOrEqual(1);
  }, 30000);

  it('Step 2: AI Director generates Edit Decision List and builds timeline tracks', async () => {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
      include: { scenes: true },
    });

    const instruction = await prisma.editingInstruction.create({
      data: {
        projectId,
        userPrompt: 'Cut all dead air and create a fast-paced energetic highlight cut',
        editingStyle: 'fast_paced',
        targetDuration: 3.5,
        status: 'processing',
      },
    });

    const plan = await aiDirectorService.generateEditingPlan({
      userPrompt: instruction.userPrompt,
      editingStyle: instruction.editingStyle,
      targetDuration: 3.5,
      videoDuration: asset!.durationSeconds || 5.0,
      scenes: asset!.scenes.map((s) => ({
        scene_index: s.sceneIndex,
        start_time: s.startTime,
        end_time: s.endTime,
        duration: s.duration,
      })),
    });

    expect(plan.clips.length).toBeGreaterThan(0);

    // Save editing plan
    await prisma.editingPlan.create({
      data: {
        projectId,
        instructionId: instruction.id,
        summary: plan.summary,
        selectedScenesJson: JSON.stringify(plan.clips),
        targetDurationSeconds: plan.targetDuration,
        status: 'generated',
      },
    });

    // Populate timeline track and clips
    const track = await prisma.timelineTrack.create({
      data: {
        projectId,
        name: 'Video Track 1',
        trackType: 'video',
        trackIndex: 0,
      },
    });

    let cursor = 0;
    for (let i = 0; i < plan.clips.length; i++) {
      const c = plan.clips[i];
      const dur = c.sourceOut - c.sourceIn;
      await prisma.timelineClip.create({
        data: {
          trackId: track.id,
          mediaAssetId,
          name: `Cut ${i + 1}`,
          startTime: cursor,
          duration: dur,
          sourceIn: c.sourceIn,
          sourceOut: c.sourceOut,
          clipOrder: i,
        },
      });
      cursor += dur;
    }

    await prisma.editingInstruction.update({
      where: { id: instruction.id },
      data: { status: 'completed' },
    });

    const storedClips = await prisma.timelineClip.findMany({ where: { trackId: track.id } });
    expect(storedClips.length).toBe(plan.clips.length);
  }, 30000);

  it('Step 3: Renders complete video sequence via FFmpeg into exported MP4', async () => {
    const job = await prisma.renderingJob.create({
      data: {
        projectId,
        jobType: 'export_video',
        status: 'processing',
        currentStage: 'Encoding video',
        progressPercent: 10,
      },
    });

    const clips = await prisma.timelineClip.findMany({
      where: { track: { projectId } },
      include: { mediaAsset: true },
      orderBy: { clipOrder: 'asc' },
    });

    const exportFilename = `pipeline_export_${Date.now()}.mp4`;
    const exportPath = storageService.getExportPath(exportFilename);

    await ffmpegService.renderTimeline({
      clips: clips.map((c) => ({
        filePath: c.mediaAsset!.storagePath,
        sourceIn: c.sourceIn,
        sourceOut: c.sourceOut,
      })),
      aspectRatio: '16:9',
      resolution: '1080p',
      outputPath: exportPath,
      onProgress: (pct, msg) => {
        job.progressPercent = pct;
        job.currentStage = msg;
      },
    });

    expect(fs.existsSync(exportPath)).toBe(true);

    const probe = await ffprobeService.probeMedia(exportPath);
    expect(probe.videoCodec).toBe('h264');
    expect(probe.width).toBe(1920);
    expect(probe.height).toBe(1080);
    expect(probe.duration).toBeGreaterThan(0);

    const exported = await prisma.exportedFile.create({
      data: {
        projectId,
        renderingJobId: job.id,
        filename: exportFilename,
        fileSizeBytes: fs.statSync(exportPath).size,
        storagePath: exportPath,
        publicUrl: storageService.getPublicUrl(exportPath),
        width: probe.width,
        height: probe.height,
        duration: probe.duration,
      },
    });

    expect(exported.id).toBeDefined();
    expect(exported.fileSizeBytes).toBeGreaterThan(1000);

    await prisma.renderingJob.update({
      where: { id: job.id },
      data: { status: 'completed', progressPercent: 100, currentStage: 'Completed' },
    });
  }, 45000);
});

