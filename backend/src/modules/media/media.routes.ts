import { FastifyInstance } from 'fastify';
import { mediaController } from './media.controller.js';

export async function mediaRoutes(app: FastifyInstance) {
  app.get('/:id', mediaController.getMediaById.bind(mediaController));
  app.delete('/:id', mediaController.deleteMedia.bind(mediaController));
}

