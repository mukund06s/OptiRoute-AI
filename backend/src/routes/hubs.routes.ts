import { Router } from 'express';
import { hubsController } from '../controllers/hubs.controller';
import { validate } from '../middleware/validate';
import { createHubSchema, hubIdSchema, updateHubSchema } from '../lib/validation';

export const hubsRouter = Router();

hubsRouter.get('/', hubsController.getAllHubs.bind(hubsController));
hubsRouter.get('/:id', validate(hubIdSchema), hubsController.getHubById.bind(hubsController));
hubsRouter.post('/', validate(createHubSchema), hubsController.createHub.bind(hubsController));
hubsRouter.put('/:id', validate(updateHubSchema), hubsController.updateHub.bind(hubsController));
hubsRouter.delete('/:id', validate(hubIdSchema), hubsController.deleteHub.bind(hubsController));
