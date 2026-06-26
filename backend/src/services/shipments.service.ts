import { prisma } from '../lib/prisma';
import type { CreateShipmentInput, ShipmentStats, ShipmentWithRelations, UpdateShipmentStatusInput, UpdateShipmentHubInput } from '../types';

export class ShipmentsService {
  private generateTrackingId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'OPT-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async getAllShipments(filters?: { status?: string; priority?: string }): Promise<ShipmentWithRelations[]> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    return await prisma.shipment.findMany({
      where,
      include: {
        originHub: true,
        destinationHub: true,
        currentHub: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getShipmentById(id: number): Promise<ShipmentWithRelations | null> {
    return await prisma.shipment.findUnique({
      where: { id },
      include: {
        originHub: true,
        destinationHub: true,
        currentHub: true,
        routeChanges: {
          orderBy: { createdAt: 'desc' },
        },
        alerts: {
          orderBy: { sentAt: 'desc' },
        },
      },
    });
  }

  async createShipment(data: CreateShipmentInput) {
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

    let trackingId = this.generateTrackingId();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await prisma.shipment.findUnique({
        where: { trackingId },
      });

      if (!existing) {
        break;
      }

      trackingId = this.generateTrackingId();
      attempts++;
    }

    if (attempts === maxAttempts) {
      throw new Error('Failed to generate unique tracking ID');
    }

    const plannedRoute = [data.originHubId, data.destinationHubId];
    const plannedRouteNames = [originHub.city, destinationHub.city];

    const shipment = await prisma.shipment.create({
      data: {
        trackingId,
        originHubId: data.originHubId,
        destinationHubId: data.destinationHubId,
        currentHubId: data.originHubId,
        status: 'pending',
        priority: data.priority || 'standard',
        weightKg: data.weightKg,
        plannedRoute,
        activeRoute: plannedRoute,
        plannedRouteNames,
        activeRouteNames: plannedRouteNames,
      },
      include: {
        originHub: true,
        destinationHub: true,
        currentHub: true,
      },
    });

    return shipment;
  }

  async updateShipmentStatus(id: number, data: UpdateShipmentStatusInput) {
    const shipment = await prisma.shipment.findUnique({ where: { id } });

    if (!shipment) {
      throw new Error('Shipment not found');
    }

    return await prisma.shipment.update({
      where: { id },
      data: {
        status: data.status,
        updatedAt: new Date(),
      },
      include: {
        originHub: true,
        destinationHub: true,
        currentHub: true,
      },
    });
  }

  async updateShipmentHub(id: number, data: UpdateShipmentHubInput) {
    const shipment = await prisma.shipment.findUnique({ where: { id } });

    if (!shipment) {
      throw new Error('Shipment not found');
    }

    const hub = await prisma.hub.findUnique({
      where: { id: data.currentHubId },
    });

    if (!hub) {
      throw new Error('Hub not found');
    }

    return await prisma.shipment.update({
      where: { id },
      data: {
        currentHubId: data.currentHubId,
        updatedAt: new Date(),
      },
      include: {
        originHub: true,
        destinationHub: true,
        currentHub: true,
      },
    });
  }

  async getShipmentStats(): Promise<ShipmentStats> {
    const [
      total,
      pending,
      inTransit,
      rerouted,
      delayed,
      delivered,
      atRisk,
    ] = await Promise.all([
      prisma.shipment.count(),
      prisma.shipment.count({ where: { status: 'pending' } }),
      prisma.shipment.count({ where: { status: 'in_transit' } }),
      prisma.shipment.count({ where: { status: 'rerouted' } }),
      prisma.shipment.count({ where: { status: 'delayed' } }),
      prisma.shipment.count({ where: { status: 'delivered' } }),
      prisma.shipment.count({ where: { status: 'at_risk' } }),
    ]);

    const active = pending + inTransit + rerouted + delayed + atRisk;

    return {
      total,
      active,
      rerouted,
      delayed,
      delivered,
      at_risk: atRisk,
    };
  }
}

export const shipmentsService = new ShipmentsService();
