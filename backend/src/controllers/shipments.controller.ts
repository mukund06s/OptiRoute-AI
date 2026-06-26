import { Request, Response } from 'express';
import { shipmentsService } from '../services/shipments.service';

export class ShipmentsController {
  async getAllShipments(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        priority: req.query.priority as string | undefined,
      };

      const shipments = await shipmentsService.getAllShipments(filters);
      res.status(200).json({ data: shipments });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch shipments' });
    }
  }

  async getShipmentById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const shipment = await shipmentsService.getShipmentById(id);

      if (!shipment) {
        res.status(404).json({ error: 'Shipment not found' });
        return;
      }

      res.status(200).json({ data: shipment });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch shipment' });
    }
  }

  async createShipment(req: Request, res: Response): Promise<void> {
    try {
      const shipment = await shipmentsService.createShipment(req.body);
      res.status(201).json({ data: shipment, message: 'Shipment created successfully' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(400).json({ error: error.message });
          return;
        }
      }
      res.status(500).json({ error: 'Failed to create shipment' });
    }
  }

  async updateShipmentStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const shipment = await shipmentsService.updateShipmentStatus(id, req.body);
      res.status(200).json({ data: shipment, message: 'Shipment status updated successfully' });
    } catch (error) {
      if (error instanceof Error && error.message === 'Shipment not found') {
        res.status(404).json({ error: 'Shipment not found' });
        return;
      }
      res.status(500).json({ error: 'Failed to update shipment status' });
    }
  }

  async updateShipmentHub(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const shipment = await shipmentsService.updateShipmentHub(id, req.body);
      res.status(200).json({ data: shipment, message: 'Shipment hub updated successfully' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Shipment not found' || error.message === 'Hub not found') {
          res.status(404).json({ error: error.message });
          return;
        }
      }
      res.status(500).json({ error: 'Failed to update shipment hub' });
    }
  }

  async getShipmentStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await shipmentsService.getShipmentStats();
      res.status(200).json({ data: stats });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch shipment stats' });
    }
  }
}

export const shipmentsController = new ShipmentsController();
