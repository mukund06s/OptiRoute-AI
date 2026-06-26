import type { Hub, Route, Shipment } from '@prisma/client';

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ShipmentWithRelations extends Shipment {
  originHub: Hub;
  destinationHub: Hub;
  currentHub?: Hub | null;
}

export interface HubWithDetails extends Hub {
  originRoutes?: Route[];
  destinationRoutes?: Route[];
}

export interface RouteWithHubs extends Route {
  originHub: Hub;
  destinationHub: Hub;
}

export interface ShipmentStats {
  total: number;
  active: number;
  rerouted: number;
  delayed: number;
  delivered: number;
  at_risk: number;
}

export interface CreateHubInput {
  name: string;
  city: string;
  state?: string;
  latitude: number;
  longitude: number;
  hubType: 'warehouse' | 'transit' | 'delivery';
  managerName?: string;
  managerEmail?: string;
}

export interface UpdateHubInput {
  name?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  hubType?: 'warehouse' | 'transit' | 'delivery';
  managerName?: string;
  managerEmail?: string;
  isActive?: boolean;
}

export interface CreateRouteInput {
  originHubId: number;
  destinationHubId: number;
  baseDistanceKm: number;
  baseDurationMinutes: number;
  roadType?: 'highway' | 'state_road' | 'city_road';
}

export interface CreateShipmentInput {
  originHubId: number;
  destinationHubId: number;
  priority?: 'standard' | 'express' | 'critical';
  weightKg?: number;
}

export interface UpdateShipmentStatusInput {
  status: 'pending' | 'in_transit' | 'rerouted' | 'delayed' | 'delivered' | 'at_risk';
}

export interface UpdateShipmentHubInput {
  currentHubId: number;
}
