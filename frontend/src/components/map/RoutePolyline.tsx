'use client';

import { Polyline } from 'react-leaflet';
import type { Hub } from '@/lib/api';

interface RoutePolylineProps {
  hubs: Hub[];
  route: number[];
  isActive?: boolean;
}

/**
 * RoutePolyline — Draws a route line on the map
 * Grey for planned routes, blue for active routes
 */
export function RoutePolyline({ hubs, route, isActive = false }: RoutePolylineProps) {
  // Build path from hub IDs
  const positions: [number, number][] = route
    .map((hubId) => {
      const hub = hubs.find((h) => h.id === hubId);
      return hub ? [Number(hub.latitude), Number(hub.longitude)] as [number, number] : null;
    })
    .filter((pos): pos is [number, number] => pos !== null);

  if (positions.length < 2) return null;

  const color = isActive ? '#3b82f6' : '#64748b'; // blue for active, grey for planned
  const weight = isActive ? 3 : 2;
  const opacity = isActive ? 0.8 : 0.5;

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color,
        weight,
        opacity,
        dashArray: isActive ? undefined : '5, 10',
      }}
    />
  );
}
