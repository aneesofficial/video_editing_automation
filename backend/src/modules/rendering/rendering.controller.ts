import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'node:fs';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { renderQueue } from '../../queues/index.js';
import { storageService } from '../../services/storage/storage.service.js';

export const CreateRenderJobSchema = z.object({
  projectId: z.string().uuid(),
  resolution: z.string().optional(),
  format: z.string().default('mp4'),
});

export class RenderingController {
  public async createRenderJob(
    req: FastifyRequest<{ Body: z.infer<typeof CreateRenderJobSchema> }>,
    reply: FastifyReply
  ) {
    const parse = CreateRenderJobSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(400).send({ success: false, error: parse.error.format() });
    }

    const { projectId, resolution } = parse.data;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { mediaAssets: true },
    });

    if (!project) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    if (project.mediaAssets.length === 0) {
      return reply.status(400).send({
        success: false,
        error: 'Cannot render project: no media assets available',
      });
    }

    if (resolution) {
      await prisma.project.update({
        where: { id: projectId },
        data: { resolution },
      });
    }

    // Create RenderingJob record
    const renderingJob = await prisma.renderingJob.create({
      data: {
        projectId,
        jobType: 'export_video',
        status: 'queued',
        progressPercent: 0,
        currentStage: 'Queued',
      },
    });

    // Enqueue BullMQ render job
    await renderQueue.add('render-video', { renderingJobId: renderingJob.id });

    return reply.status(202).send({
      success: true,
      data: {
        jobId: renderingJob.id,
        status: renderingJob.status,
        message: 'Render job queued successfully',
      },
    });
  }

  public async getRenderJob(
    req: FastifyRequest<{ Params: { jobId: string } }>,
    reply: FastifyReply
  ) {
    const { jobId } = req.params;

    const job = await prisma.renderingJob.findUnique({
      where: { id: jobId },
      include: {
        jobEvents: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
        exportedFiles: true,
      },
    });

    if (!job) {
      return reply.status(404).send({ success: false, error: 'Rendering job not found' });
    }

    return reply.send({ success: true, data: job });
  }

  public async listProjectExports(
    req: FastifyRequest<{ Params: { projectId: string } }>,
    reply: FastifyReply
  ) {
    const { projectId } = req.params;

    const exportsList = await prisma.exportedFile.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ success: true, data: exportsList });
  }

  public async downloadExport(
    req: FastifyRequest<{ Params: { exportId: string } }>,
    reply: FastifyReply
  ) {
    const { exportId } = req.params;

    const exportedFile = await prisma.exportedFile.findUnique({
      where: { id: exportId },
    });

    if (!exportedFile || !storageService.fileExists(exportedFile.storagePath)) {
      return reply.status(404).send({ success: false, error: 'Exported file not found on disk' });
    }

    const stream = fs.createReadStream(exportedFile.storagePath);
    reply.header('Content-Type', exportedFile.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(exportedFile.filename)}"`
    );

    return reply.send(stream);
  }
}

export const renderingController = new RenderingController();
