import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/queue.js';
import { prisma } from '../config/database.js';
import { aiDirectorService } from '../services/ollama/ai-director.service.js';
import { pythonBridgeService } from '../services/python/python-bridge.service.js';

export interface AIDirectorJobData {
  instructionId: string;
}

export const aiDirectorWorker = new Worker<AIDirectorJobData>(
  'ai-director',
  async (job: Job<AIDirectorJobData>) => {
    const { instructionId } = job.data;
    console.log(`[AIDirectorWorker] Processing instruction: ${instructionId}`);

    const instruction = await prisma.editingInstruction.findUnique({
      where: { id: instructionId },
      include: {
        project: {
          include: {
            mediaAssets: {
              include: {
                scenes: { orderBy: { sceneIndex: 'asc' } },
                transcription: { include: { segments: { orderBy: { startTime: 'asc' } } } },
                metadata: true,
              },
            },
          },
        },
      },
    });

    if (!instruction) {
      throw new Error(`EditingInstruction not found: ${instructionId}`);
    }

    await prisma.editingInstruction.update({
      where: { id: instructionId },
      data: { status: 'processing' },
    });

    try {
      await job.updateProgress(20);

      const primaryAsset = instruction.project.mediaAssets[0];
      if (!primaryAsset) {
        throw new Error('Project has no uploaded media assets to edit');
      }

      // Check silences if silence removal requested
      let silences: Array<{ start: number; end: number; duration: number }> = [];
      if (instruction.removeSilences) {
        silences = await pythonBridgeService.detectSilence(primaryAsset.storagePath);
      }

      await job.updateProgress(40);

      // Collect scenes
      const scenes = primaryAsset.scenes.map((s) => ({
        scene_index: s.sceneIndex,
        start_time: s.startTime,
        end_time: s.endTime,
        duration: s.duration,
      }));

      // Collect transcription
      const transcription = primaryAsset.transcription
        ? {
            full_text: primaryAsset.transcription.fullText,
            segments: primaryAsset.transcription.segments.map((seg) => ({
              start: seg.startTime,
              end: seg.endTime,
              text: seg.text,
            })),
          }
        : undefined;

      const videoDuration = primaryAsset.durationSeconds || primaryAsset.metadata?.duration || 10.0;

      await job.updateProgress(60);
      console.log(`[AIDirectorWorker] Generating plan via Ollama for project ${instruction.projectId}...`);

      const plan = await aiDirectorService.generateEditingPlan({
        userPrompt: instruction.userPrompt,
        editingStyle: instruction.editingStyle,
        targetDuration: instruction.targetDuration || undefined,
        videoDuration,
        scenes,
        transcription,
        silences,
      });

      await job.updateProgress(80);

      // Save EditingPlan to DB
      await prisma.editingPlan.upsert({
        where: { instructionId },
        create: {
          projectId: instruction.projectId,
          instructionId,
          summary: plan.summary,
          rationale: plan.rationale,
          selectedScenesJson: JSON.stringify(plan.clips),
          removedSilencesJson: JSON.stringify(silences),
          captionPlanJson: JSON.stringify(plan.captions || []),
          audioPlanJson: JSON.stringify(plan.music || {}),
          transitionsJson: JSON.stringify(plan.transitions || []),
          targetDurationSeconds: plan.targetDuration,
          status: 'generated',
        },
        update: {
          summary: plan.summary,
          rationale: plan.rationale,
          selectedScenesJson: JSON.stringify(plan.clips),
          removedSilencesJson: JSON.stringify(silences),
          captionPlanJson: JSON.stringify(plan.captions || []),
          audioPlanJson: JSON.stringify(plan.music || {}),
          transitionsJson: JSON.stringify(plan.transitions || []),
          targetDurationSeconds: plan.targetDuration,
          status: 'generated',
        },
      });

      // Synchronize timeline: create default Video and Caption tracks
      let videoTrack = await prisma.timelineTrack.findFirst({
        where: { projectId: instruction.projectId, trackType: 'video' },
      });

      if (!videoTrack) {
        videoTrack = await prisma.timelineTrack.create({
          data: {
            projectId: instruction.projectId,
            name: 'Video Track 1',
            trackType: 'video',
            trackIndex: 0,
          },
        });
      }

      // Clear previous clips on this track
      await prisma.timelineClip.deleteMany({
        where: { trackId: videoTrack.id },
      });

      // Insert new clips calculated by AI Director
      let timelineCursor = 0;
      for (let idx = 0; idx < plan.clips.length; idx++) {
        const c = plan.clips[idx];
        const clipDuration = (c.sourceOut - c.sourceIn) / (c.speed || 1.0);

        await prisma.timelineClip.create({
          data: {
            trackId: videoTrack.id,
            mediaAssetId: primaryAsset.id,
            name: `Clip ${idx + 1} (${c.sourceIn.toFixed(1)}s - ${c.sourceOut.toFixed(1)}s)`,
            startTime: timelineCursor,
            duration: clipDuration,
            sourceIn: c.sourceIn,
            sourceOut: c.sourceOut,
            speed: c.speed || 1.0,
            clipOrder: idx,
          },
        });

        timelineCursor += clipDuration;
      }

      // Add Captions track if captions generated
      if (plan.captions && plan.captions.length > 0) {
        let captionTrack = await prisma.timelineTrack.findFirst({
          where: { projectId: instruction.projectId, trackType: 'caption' },
        });

        if (!captionTrack) {
          captionTrack = await prisma.timelineTrack.create({
            data: {
              projectId: instruction.projectId,
              name: 'Captions',
              trackType: 'caption',
              trackIndex: 1,
            },
          });
        }

        await prisma.captionItem.deleteMany({ where: { trackId: captionTrack.id } });

        for (const cap of plan.captions) {
          await prisma.captionItem.create({
            data: {
              trackId: captionTrack.id,
              startTime: cap.startTime,
              endTime: cap.endTime,
              text: cap.text,
              styleJson: JSON.stringify({ style: cap.style }),
            },
          });
        }
      }

      // Update project total duration
      await prisma.project.update({
        where: { id: instruction.projectId },
        data: {
          durationSeconds: timelineCursor,
          status: 'ready',
        },
      });

      // Mark instruction completed
      await prisma.editingInstruction.update({
        where: { id: instructionId },
        data: { status: 'completed' },
      });

      await job.updateProgress(100);
      console.log(`[AIDirectorWorker] Plan generated successfully for project ${instruction.projectId}`);
    } catch (err) {
      console.error(`[AIDirectorWorker] Error processing instruction ${instructionId}:`, err);
      await prisma.editingInstruction.update({
        where: { id: instructionId },
        data: {
          status: 'failed',
          errorMessage: (err as Error).message,
        },
      });
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,
  }
);
