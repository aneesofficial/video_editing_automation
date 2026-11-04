import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../config/database.js';
import { storageService } from '../../services/storage/storage.service.js';

export class MediaController {
  public async getMediaById(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = req.params;

    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        metadata: true,
        scenes: { orderBy: { sceneIndex: 'asc' } },
        transcription: {
          include: { segments: { orderBy: { startTime: 'asc' } } },
        },
      },
    });

    if (!mediaAsset) {
      return reply.status(404).send({ success: false, error: 'Media asset not found' });
    }

    return reply.send({
      success: true,
      data: {
        ...mediaAsset,
        publicUrl: storageService.getPublicUrl(mediaAsset.storagePath),
      },
    });
  }

  public async deleteMedia(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = req.params;

    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id },
    });

    if (!mediaAsset) {
      return reply.status(404).send({ success: false, error: 'Media asset not found' });
    }

    storageService.deleteFile(mediaAsset.storagePath);

    await prisma.mediaAsset.delete({
      where: { id },
    });

    return reply.send({ success: true, message: 'Media asset deleted successfully' });
  }
}

export const mediaController = new MediaController();

