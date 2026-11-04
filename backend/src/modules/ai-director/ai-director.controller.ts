import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { aiDirectorQueue } from '../../queues/index.js';

export const SubmitInstructionSchema = z.object({
  projectId: z.string().uuid(),
  userPrompt: z.string().min(1, 'Prompt is required'),
  editingStyle: z.string().default('dynamic'),
  targetDuration: z.number().optional(),
  musicMood: z.string().optional(),
  captionStyle: z.string().optional(),
  autoColorGrade: z.boolean().default(false),
  autoDenoise: z.boolean().default(false),
  removeSilences: z.boolean().default(true),
});

export class AIDirectorController {
  public async submitInstruction(
    req: FastifyRequest<{ Body: z.infer<typeof SubmitInstructionSchema> }>,
    reply: FastifyReply
  ) {
    const parse = SubmitInstructionSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(400).send({ success: false, error: parse.error.format() });
    }

    const {
      projectId,
      userPrompt,
      editingStyle,
      targetDuration,
      musicMood,
      captionStyle,
      autoColorGrade,
      autoDenoise,
      removeSilences,
    } = parse.data;

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
        error: 'Please upload at least one video asset before generating an edit plan',
      });
    }

    // Create EditingInstruction record
    const instruction = await prisma.editingInstruction.create({
      data: {
        projectId,
        userPrompt,
        editingStyle,
        targetDuration,
        musicMood,
        captionStyle,
        autoColorGrade,
        autoDenoise,
        removeSilences,
        status: 'pending',
      },
    });

    // Update project status to processing
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'processing' },
    });

    // Enqueue background AI Director job
    await aiDirectorQueue.add('generate-plan', { instructionId: instruction.id });

    return reply.status(202).send({
      success: true,
      data: {
        instructionId: instruction.id,
        status: instruction.status,
        message: 'AI Director editing plan generation queued',
      },
    });
  }

  public async getInstructionStatus(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = req.params;

    const instruction = await prisma.editingInstruction.findUnique({
      where: { id },
      include: {
        editingPlan: true,
      },
    });

    if (!instruction) {
      return reply.status(404).send({ success: false, error: 'Instruction not found' });
    }

    return reply.send({ success: true, data: instruction });
  }

  public async getProjectPlan(
    req: FastifyRequest<{ Params: { projectId: string } }>,
    reply: FastifyReply
  ) {
    const { projectId } = req.params;

    const plan = await prisma.editingPlan.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { instruction: true },
    });

    if (!plan) {
      return reply.status(404).send({ success: false, error: 'No editing plan found for this project' });
    }

    return reply.send({
      success: true,
      data: {
        ...plan,
        selectedScenes: JSON.parse(plan.selectedScenesJson || '[]'),
        removedSilences: plan.removedSilencesJson ? JSON.parse(plan.removedSilencesJson) : [],
        captionPlan: plan.captionPlanJson ? JSON.parse(plan.captionPlanJson) : [],
        audioPlan: plan.audioPlanJson ? JSON.parse(plan.audioPlanJson) : {},
        transitions: plan.transitionsJson ? JSON.parse(plan.transitionsJson) : [],
      },
    });
  }
}

export const aiDirectorController = new AIDirectorController();

