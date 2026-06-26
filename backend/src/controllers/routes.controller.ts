import { Request, Response } from 'express';
import { routesService } from '../services/routes.service';

export class RoutesController {
  async getAllRoutes(_req: Request, res: Response): Promise<void> {
    try {
      const routes = await routesService.getAllRoutes();
      res.status(200).json({ data: routes });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch routes' });
    }
  }

  async getRoutesByHub(req: Request, res: Response): Promise<void> {
    try {
      const hubId = parseInt(req.params.hubId);
      const routes = await routesService.getRoutesByHub(hubId);
      res.status(200).json({ data: routes });
    } catch (error) {
      if (error instanceof Error && error.message === 'Hub not found') {
        res.status(404).json({ error: 'Hub not found' });
        return;
      }
      res.status(500).json({ error: 'Failed to fetch routes' });
    }
  }

  async createRoute(req: Request, res: Response): Promise<void> {
    try {
      const route = await routesService.createRoute(req.body);
      res.status(201).json({ data: route, message: 'Route created successfully' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('already exists')) {
          res.status(400).json({ error: error.message });
          return;
        }
      }
      res.status(500).json({ error: 'Failed to create route' });
    }
  }
}

export const routesController = new RoutesController();
