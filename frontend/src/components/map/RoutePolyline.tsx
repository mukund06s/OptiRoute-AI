'use client';

import { memo, useMemo } from 'react';
import { Polyline } from 'react-leaflet';

interface RoutePolylineProps {
  positions: [number, number][];
  isActive?: boolean;
}

/**
 * RoutePolyline — Draws a route line on the map
 * Grey for planned routes, blue for active routes
 */
export const RoutePolyline = memo(function RoutePolyline({
  positions,
  isActive = false,
}: RoutePolylineProps) {
  const pathOptions = useMemo(
    () => ({
      color: isActive ? '#3b82f6' : '#64748b',
      weight: isActive ? 3 : 2,
      opacity: isActive ? 0.8 : 0.5,
      dashArray: isActive ? undefined : ('5, 10' as const),
    }),
    [isActive],
  );

  if (positions.length < 2) return null;

  return <Polyline positions={positions} pathOptions={pathOptions} />;
});
