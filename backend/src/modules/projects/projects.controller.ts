import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';

export const CreateProjectSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  targetPlatform: z.string().default('youtube'),
  aspectRatio: z.string().default('16:9'),
  resolution: z.string().default('1080p'),
});

export const UpdateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  targetPlatform: z.string().optional(),
  aspectRatio: z.string().optional(),
  resolution: z.string().optional(),
  status: z.string().optional(),
});

export class ProjectsController {
  public async listProjects(req: FastifyRequest, reply: FastifyReply) {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            mediaAssets: true,
            exportedFiles: true,
          },
        },
        exportedFiles: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return reply.send({ success: true, data: projects });
  }

  public async getProjectById(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        mediaAssets: {
          include: {
            metadata: true,
            scenes: { orderBy: { sceneIndex: 'asc' } },
            transcription: {
              include: { segments: { orderBy: { startTime: 'asc' } } },
            },
          },
        },
        editingInstructions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        editingPlans: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        timelineTracks: {
          orderBy: { trackIndex: 'asc' },
          include: {
            clips: {
              orderBy: { clipOrder: 'asc' },
              include: { mediaAsset: true },
            },
            captions: {
              orderBy: { startTime: 'asc' },
            },
            audios: true,
          },
        },
        renderingJobs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { jobEvents: { orderBy: { timestamp: 'desc' }, take: 10 } },
        },
        exportedFiles: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    return reply.send({ success: true, data: project });
  }

  public async createProject(
    req: FastifyRequest<{ Body: z.infer<typeof CreateProjectSchema> }>,
    reply: FastifyReply
  ) {
    const parse = CreateProjectSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(400).send({ success: false, error: parse.error.format() });
    }

    const { title, description, targetPlatform, aspectRatio, resolution } = parse.data;

    const project = await prisma.project.create({
      data: {
        title,
        description,
        targetPlatform,
        aspectRatio,
        resolution,
        status: 'draft',
      },
    });

    // Create default timeline tracks: Video Track 1 & Caption Track
    await prisma.timelineTrack.createMany({
      data: [
        {
          projectId: project.id,
          name: 'Video Track 1',
          trackType: 'video',
          trackIndex: 0,
        },
        {
          projectId: project.id,
          name: 'Captions',
          trackType: 'caption',
          trackIndex: 1,
        },
        {
          projectId: project.id,
          name: 'Audio Track 1',
          trackType: 'audio',
          trackIndex: 2,
        },
      ],
    });

    return reply.status(201).send({ success: true, data: project });
  }

  public async updateProject(
    req: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof UpdateProjectSchema> }>,
    reply: FastifyReply
  ) {
    const { id } = req.params;
    const parse = UpdateProjectSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(400).send({ success: false, error: parse.error.format() });
    }

    const project = await prisma.project.update({
      where: { id },
      data: parse.data,
    });

    return reply.send({ success: true, data: project });
  }

  public async deleteProject(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = req.params;

    await prisma.project.delete({
      where: { id },
    });

    return reply.send({ success: true, message: 'Project deleted successfully' });
  }
}

export const projectsController = new ProjectsController();

