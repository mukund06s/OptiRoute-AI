import { Router } from 'express';
import { routingController } from '../controllers/routing.controller';
import { validate } from '../middleware/validate';
import { calculateRouteSchema, shipmentIdParamSchema } from '../lib/validation';

export const routingRouter = Router();

routingRouter.post(
  '/calculate',
  validate(calculateRouteSchema),
  routingController.calculateRoute.bind(routingController)
);

routingRouter.post(
  '/reroute/:shipmentId',
  validate(shipmentIdParamSchema),
  routingController.rerouteShipment.bind(routingController)
);

routingRouter.post('/reroute-all', routingController.rerouteAll.bind(routingController));

routingRouter.get('/graph-state', routingController.getGraphState.bind(routingController));
