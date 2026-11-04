import { FastifyInstance } from 'fastify';
import { editingController } from './editing.controller.js';

export async function editingRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/timeline', editingController.getTimeline.bind(editingController));
  app.put('/projects/:projectId/timeline', editingController.updateTimeline.bind(editingController));
}

