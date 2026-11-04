import { FastifyInstance } from 'fastify';
import { uploadsController } from './uploads.controller.js';

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/', uploadsController.uploadMedia.bind(uploadsController));
}

