import { prisma } from '../lib/prisma';
import type { CreateRouteInput, RouteWithHubs } from '../types';

export class RoutesService {
  async getAllRoutes(): Promise<RouteWithHubs[]> {
    return await prisma.route.findMany({
      where: { isActive: true },
      include: {
        originHub: true,
        destinationHub: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRoutesByHub(hubId: number): Promise<RouteWithHubs[]> {
    const hub = await prisma.hub.findUnique({ where: { id: hubId } });
    
    if (!hub) {
      throw new Error('Hub not found');
    }

    return await prisma.route.findMany({
      where: {
        isActive: true,
        OR: [
          { originHubId: hubId },
          { destinationHubId: hubId },
        ],
      },
      include: {
        originHub: true,
        destinationHub: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRoute(data: CreateRouteInput) {
    const originHub = await prisma.hub.findUnique({
      where: { id: data.originHubId },
    });

    if (!originHub) {
      throw new Error('Origin hub not found');
    }

    const destinationHub = await prisma.hub.findUnique({
      where: { id: data.destinationHubId },
    });

    if (!destinationHub) {
      throw new Error('Destination hub not found');
    }

    const existingRoute = await prisma.route.findFirst({
      where: {
        originHubId: data.originHubId,
        destinationHubId: data.destinationHubId,
        isActive: true,
      },
    });

    if (existingRoute) {
      throw new Error('Route already exists between these hubs');
    }

    const route = await prisma.route.create({
      data,
      include: {
        originHub: true,
        destinationHub: true,
      },
    });

    return route;
  }
}

export const routesService = new RoutesService();
