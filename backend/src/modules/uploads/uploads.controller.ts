import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database.js';
import { storageService } from '../../services/storage/storage.service.js';
import { analysisQueue } from '../../queues/index.js';

export class UploadsController {
  public async uploadMedia(req: FastifyRequest, reply: FastifyReply) {
    if (!req.isMultipart()) {
      return reply.status(400).send({ success: false, error: 'Request is not multipart' });
    }

    const part = await req.file();
    if (!part) {
      return reply.status(400).send({ success: false, error: 'No file uploaded' });
    }

    // Extract fields from multipart: projectId
    const fields = part.fields as Record<string, { value: string }>;
    const projectId = fields?.projectId?.value || (req.query as { projectId?: string })?.projectId;

    if (!projectId) {
      return reply.status(400).send({ success: false, error: 'projectId is required' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return reply.status(404).send({ success: false, error: 'Target project not found' });
    }

    const fileExt = path.extname(part.filename) || '.mp4';
    const uniqueFilename = `${uuidv4()}${fileExt}`;
    const destinationPath = storageService.getUploadPath(uniqueFilename);

    // Stream upload directly to disk
    await pipeline(part.file, fs.createWriteStream(destinationPath));

    const fileSize = storageService.getFileSize(destinationPath);
    const mimeType = part.mimetype || 'video/mp4';

    // Create MediaAsset record
    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        projectId,
        filename: uniqueFilename,
        originalName: part.filename,
        mimeType,
        fileSizeBytes: fileSize,
        storagePath: destinationPath,
        status: 'uploaded',
      },
    });

    // Enqueue background analysis job
    await analysisQueue.add('analyze', { mediaAssetId: mediaAsset.id });

    return reply.status(201).send({
      success: true,
      data: {
        id: mediaAsset.id,
        filename: mediaAsset.filename,
        originalName: mediaAsset.originalName,
        mimeType: mediaAsset.mimeType,
        fileSizeBytes: mediaAsset.fileSizeBytes,
        status: mediaAsset.status,
      },
    });
  }
}

export const uploadsController = new UploadsController();

