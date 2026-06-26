import { prisma } from '../lib/prisma';
import type { CreateHubInput, HubWithDetails, UpdateHubInput } from '../types';

export class HubsService {
  async getAllHubs() {
    return await prisma.hub.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getHubById(id: number): Promise<HubWithDetails | null> {
    const hub = await prisma.hub.findUnique({
      where: { id },
      include: {
        originRoutes: {
          include: {
            destinationHub: true,
          },
        },
        destinationRoutes: {
          include: {
            originHub: true,
          },
        },
      },
    });

    return hub;
  }

  async createHub(data: CreateHubInput) {
    return await prisma.hub.create({
      data,
    });
  }

  async updateHub(id: number, data: UpdateHubInput) {
    const hub = await prisma.hub.findUnique({ where: { id } });
    
    if (!hub) {
      throw new Error('Hub not found');
    }

    return await prisma.hub.update({
      where: { id },
      data,
    });
  }

  async deleteHub(id: number) {
    const hub = await prisma.hub.findUnique({ where: { id } });
    
    if (!hub) {
      throw new Error('Hub not found');
    }

    return await prisma.hub.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const hubsService = new HubsService();
