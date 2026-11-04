import { FastifyInstance } from 'fastify';
import { aiDirectorController } from './ai-director.controller.js';

export async function aiDirectorRoutes(app: FastifyInstance) {
  app.post('/generate', aiDirectorController.submitInstruction.bind(aiDirectorController));
  app.get('/instructions/:id', aiDirectorController.getInstructionStatus.bind(aiDirectorController));
  app.get('/projects/:projectId/plan', aiDirectorController.getProjectPlan.bind(aiDirectorController));
}

