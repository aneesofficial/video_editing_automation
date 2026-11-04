import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../config/database.js';

export class JobsController {
  public async getJob(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = req.params;

    const job = await prisma.renderingJob.findUnique({
      where: { id },
      include: {
        jobEvents: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
        exportedFiles: true,
      },
    });

    if (!job) {
      return reply.status(404).send({ success: false, error: 'Job not found' });
    }

    return reply.send({ success: true, data: job });
  }

  public async streamJobEvents(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = req.params;

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Push initial status
    const initialJob = await prisma.renderingJob.findUnique({
      where: { id },
      include: { exportedFiles: true },
    });

    if (initialJob) {
      reply.raw.write(`data: ${JSON.stringify(initialJob)}\n\n`);
    }

    // Interval poller pushes updates every 1.5 seconds until job is completed or failed
    const interval = setInterval(async () => {
      try {
        const job = await prisma.renderingJob.findUnique({
          where: { id },
          include: { exportedFiles: true },
        });

        if (!job) {
          clearInterval(interval);
          reply.raw.end();
          return;
        }

        reply.raw.write(`data: ${JSON.stringify(job)}\n\n`);

        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(interval);
          reply.raw.end();
        }
      } catch {
        clearInterval(interval);
        reply.raw.end();
      }
    }, 1500);

    req.raw.on('close', () => {
      clearInterval(interval);
    });
  }
}

export const jobsController = new JobsController();
