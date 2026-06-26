import { z } from 'zod';

export const createHubSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    city: z.string().min(1).max(100),
    state: z.string().max(100).optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    hubType: z.enum(['warehouse', 'transit', 'delivery']),
    managerName: z.string().max(100).optional(),
    managerEmail: z.string().email().max(255).optional(),
  }),
});

export const updateHubSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    city: z.string().min(1).max(100).optional(),
    state: z.string().max(100).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    hubType: z.enum(['warehouse', 'transit', 'delivery']).optional(),
    managerName: z.string().max(100).optional(),
    managerEmail: z.string().email().max(255).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const hubIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  }),
});

export const hubIdParamSchema = z.object({
  params: z.object({
    hubId: z.string().regex(/^\d+$/).transform(Number),
  }),
});

export const createRouteSchema = z.object({
  body: z.object({
    originHubId: z.number().int().positive(),
    destinationHubId: z.number().int().positive(),
    baseDistanceKm: z.number().positive(),
    baseDurationMinutes: z.number().int().positive(),
    roadType: z.enum(['highway', 'state_road', 'city_road']).optional(),
  }).refine((data) => data.originHubId !== data.destinationHubId, {
    message: 'Origin and destination hubs must be different',
    path: ['destinationHubId'],
  }),
});

export const createShipmentSchema = z.object({
  body: z.object({
    originHubId: z.number().int().positive(),
    destinationHubId: z.number().int().positive(),
    priority: z.enum(['standard', 'express', 'critical']).optional(),
    weightKg: z.number().positive().optional(),
  }).refine((data) => data.originHubId !== data.destinationHubId, {
    message: 'Origin and destination hubs must be different',
    path: ['destinationHubId'],
  }),
});

export const updateShipmentStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  }),
  body: z.object({
    status: z.enum(['pending', 'in_transit', 'rerouted', 'delayed', 'delivered', 'at_risk']),
  }),
});

export const updateShipmentHubSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  }),
  body: z.object({
    currentHubId: z.number().int().positive(),
  }),
});

// Routing API Schemas
export const calculateRouteSchema = z.object({
  body: z.object({
    originHubId: z.number().int().positive(),
    destinationHubId: z.number().int().positive(),
  }),
});

export const shipmentIdParamSchema = z.object({
  params: z.object({
    shipmentId: z.string().regex(/^\d+$/).transform(Number),
  }),
});

export const shipmentIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  }),
});

export const shipmentQuerySchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'in_transit', 'rerouted', 'delayed', 'delivered', 'at_risk']).optional(),
    priority: z.enum(['standard', 'express', 'critical']).optional(),
  }),
});
