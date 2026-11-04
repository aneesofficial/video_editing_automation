import { FastifyInstance } from 'fastify';
import { jobsController } from './jobs.controller.js';

export async function jobRoutes(app: FastifyInstance) {
  app.get('/:id', jobsController.getJob.bind(jobsController));
  app.get('/:id/events', jobsController.streamJobEvents.bind(jobsController));
}

