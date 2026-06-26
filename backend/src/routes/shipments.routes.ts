import { Router } from 'express';
import { shipmentsController } from '../controllers/shipments.controller';
import { validate } from '../middleware/validate';
import {
  createShipmentSchema,
  shipmentIdSchema,
  shipmentQuerySchema,
  updateShipmentHubSchema,
  updateShipmentStatusSchema,
} from '../lib/validation';

export const shipmentsRouter = Router();

shipmentsRouter.get('/', validate(shipmentQuerySchema), shipmentsController.getAllShipments.bind(shipmentsController));
shipmentsRouter.get('/stats', shipmentsController.getShipmentStats.bind(shipmentsController));
shipmentsRouter.get('/:id', validate(shipmentIdSchema), shipmentsController.getShipmentById.bind(shipmentsController));
shipmentsRouter.post('/', validate(createShipmentSchema), shipmentsController.createShipment.bind(shipmentsController));
shipmentsRouter.patch('/:id/status', validate(updateShipmentStatusSchema), shipmentsController.updateShipmentStatus.bind(shipmentsController));
shipmentsRouter.patch('/:id/hub', validate(updateShipmentHubSchema), shipmentsController.updateShipmentHub.bind(shipmentsController));
