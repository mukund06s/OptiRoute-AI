'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { hubsApi, shipmentsApi, type Hub, type ShipmentListItem } from '@/lib/api';
import { Loader2, AlertCircle } from 'lucide-react';

// Dynamic imports to avoid SSR issues with Leaflet
const MapContainer = dynamic(() => import('@/components/map').then((mod) => mod.MapContainer), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-900">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  ),
});

const HubMarker = dynamic(() => import('@/components/map').then((mod) => mod.HubMarker), { ssr: false });
const RoutePolyline = dynamic(() => import('@/components/map').then((mod) => mod.RoutePolyline), { ssr: false });
const RiskLegend = dynamic(() => import('@/components/map').then((mod) => mod.RiskLegend), { ssr: false });
const MapToolbar = dynamic(() => import('@/components/map').then((mod) => mod.MapToolbar), { ssr: false });
const HubDetailPanel = dynamic(() => import('@/components/map').then((mod) => mod.HubDetailPanel), { ssr: false });

/**
 * Map Page — Interactive logistics map
 * Displays hubs with risk coloring, routes, and hub details
 * Auto-refreshes every 30 seconds via React Query
 * ZERO business logic — only renders backend data
 */
export default function MapPage() {
  const [selectedHub, setSelectedHub] = useState<Hub | null>(null);
  const [showRoutes, setShowRoutes] = useState(true);

  // Fetch hubs with risk scores (auto-refresh every 30s)
  const {
    data: hubsData,
    isLoading: hubsLoading,
    error: hubsError,
  } = useQuery({
    queryKey: ['hubs'],
    queryFn: hubsApi.list,
    staleTime: 30_000,
  });

  // Fetch active shipments for route visualization
  const {
    data: shipmentsData,
    isLoading: shipmentsLoading,
  } = useQuery({
    queryKey: ['shipments', 'in_transit'],
    queryFn: () => shipmentsApi.list({ status: 'in_transit' }),
    staleTime: 30_000,
  });

  const hubs = hubsData?.hubs ?? [];
  const shipments = shipmentsData?.shipments ?? [];

  // Loading state
  if (hubsLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900">
        <Loader2 className="w-12 h-12 animate-spin text-blue-400 mb-4" />
        <p className="text-slate-400 text-sm">Loading map data...</p>
      </div>
    );
  }

  // Error state
  if (hubsError) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-slate-200 text-lg font-semibold mb-2">Failed to load map</p>
        <p className="text-slate-400 text-sm">
          {hubsError instanceof Error ? hubsError.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  // Empty state
  if (hubs.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900">
        <AlertCircle className="w-12 h-12 text-amber-400 mb-4" />
        <p className="text-slate-200 text-lg font-semibold mb-2">No hubs found</p>
        <p className="text-slate-400 text-sm">Please add hubs to the system</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Map Container */}
      <MapContainer>
        {/* Hub Markers */}
        {hubs.map((hub) => (
          <HubMarker key={hub.id} hub={hub} onClick={setSelectedHub} />
        ))}

        {/* Route Polylines */}
        {showRoutes &&
          !shipmentsLoading &&
          shipments.map((shipment: ShipmentListItem) => (
            <div key={shipment.id}>
              {/* Planned route (dashed grey) */}
              {shipment.plannedRoute && shipment.plannedRoute.length > 1 && (
                <RoutePolyline hubs={hubs} route={shipment.plannedRoute} isActive={false} />
              )}
              {/* Active route (solid blue) - only if different from planned */}
              {shipment.activeRoute &&
                shipment.activeRoute.length > 1 &&
                JSON.stringify(shipment.activeRoute) !== JSON.stringify(shipment.plannedRoute) && (
                  <RoutePolyline hubs={hubs} route={shipment.activeRoute} isActive={true} />
                )}
            </div>
          ))}
      </MapContainer>

      {/* Map Controls - Top Left */}
      <div className="absolute top-4 left-4 z-[1000]">
        <MapToolbar showRoutes={showRoutes} onToggleRoutes={() => setShowRoutes(!showRoutes)} />
      </div>

      {/* Legend - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <RiskLegend />
      </div>

      {/* Hub Detail Panel - Right Side */}
      {selectedHub && <HubDetailPanel hub={selectedHub} onClose={() => setSelectedHub(null)} />}

      {/* Loading Overlay for Shipments */}
      {shipmentsLoading && showRoutes && (
        <div className="absolute top-20 left-4 z-[1000] bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 text-slate-300 text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Loading routes...</span>
          </div>
        </div>
      )}
    </div>
  );
}
