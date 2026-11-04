import { FastifyInstance } from 'fastify';
import { projectsController } from './projects.controller.js';

export async function projectRoutes(app: FastifyInstance) {
  app.get('/', projectsController.listProjects.bind(projectsController));
  app.post('/', projectsController.createProject.bind(projectsController));
  app.get('/:id', projectsController.getProjectById.bind(projectsController));
  app.patch('/:id', projectsController.updateProject.bind(projectsController));
  app.delete('/:id', projectsController.deleteProject.bind(projectsController));
}

