import { FastifyReply, FastifyRequest } from 'fastify';
import { systemService } from '../../services/system/system.service.js';

export class SystemController {
  public async getHealth(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const health = await systemService.getHealth();
      return reply.send(health);
    } catch (err: any) {
      return reply.status(500).send({
        status: 'error',
        message: err.message || 'Failed to perform health check',
      });
    }
  }

  public async getStorage(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const storage = await systemService.getStorageOverview();
      return reply.send({ success: true, data: storage });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || 'Failed to retrieve storage overview',
      });
    }
  }

  public async cleanCache(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await systemService.cleanCache();
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || 'Failed to clean cache',
      });
    }
  }

  public async createBackup(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await systemService.createBackup();
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || 'Failed to create backup',
      });
    }
  }

  public async listBackups(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const list = await systemService.listBackups();
      return reply.send({ success: true, data: list });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || 'Failed to list backups',
      });
    }
  }
}

export const systemController = new SystemController();

