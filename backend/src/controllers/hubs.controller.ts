import { Request, Response } from 'express';
import { hubsService } from '../services/hubs.service';

export class HubsController {
  async getAllHubs(_req: Request, res: Response): Promise<void> {
    try {
      const hubs = await hubsService.getAllHubs();
      res.status(200).json({ data: hubs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch hubs' });
    }
  }

  async getHubById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const hub = await hubsService.getHubById(id);

      if (!hub) {
        res.status(404).json({ error: 'Hub not found' });
        return;
      }

      res.status(200).json({ data: hub });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch hub' });
    }
  }

  async createHub(req: Request, res: Response): Promise<void> {
    try {
      const hub = await hubsService.createHub(req.body);
      res.status(201).json({ data: hub, message: 'Hub created successfully' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to create hub' });
    }
  }

  async updateHub(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const hub = await hubsService.updateHub(id, req.body);
      res.status(200).json({ data: hub, message: 'Hub updated successfully' });
    } catch (error) {
      if (error instanceof Error && error.message === 'Hub not found') {
        res.status(404).json({ error: 'Hub not found' });
        return;
      }
      res.status(500).json({ error: 'Failed to update hub' });
    }
  }

  async deleteHub(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const hub = await hubsService.deleteHub(id);
      res.status(200).json({ data: hub, message: 'Hub deactivated successfully' });
    } catch (error) {
      if (error instanceof Error && error.message === 'Hub not found') {
        res.status(404).json({ error: 'Hub not found' });
        return;
      }
      res.status(500).json({ error: 'Failed to delete hub' });
    }
  }
}

export const hubsController = new HubsController();
