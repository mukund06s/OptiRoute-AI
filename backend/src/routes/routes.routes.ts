import { Router } from 'express';
import { routesController } from '../controllers/routes.controller';
import { validate } from '../middleware/validate';
import { createRouteSchema, hubIdParamSchema } from '../lib/validation';

export const routesRouter = Router();

routesRouter.get('/', routesController.getAllRoutes.bind(routesController));
routesRouter.get('/hub/:hubId', validate(hubIdParamSchema), routesController.getRoutesByHub.bind(routesController));
routesRouter.post('/', validate(createRouteSchema), routesController.createRoute.bind(routesController));
