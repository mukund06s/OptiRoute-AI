'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { hubsApi, shipmentsApi, type Hub, type ShipmentListItem } from '@/lib/api';
import { Loader2, AlertCircle } from 'lucide-react';

const REFRESH_MS = 30_000;

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

function routePositions(hubCoords: Map<number, [number, number]>, route: number[]): [number, number][] {
  const positions: [number, number][] = [];
  for (const hubId of route) {
    const coords = hubCoords.get(hubId);
    if (coords) positions.push(coords);
  }
  return positions;
}

/**
 * Map Page — Interactive logistics map
 * Displays hubs with risk coloring, routes, and hub details
 * Auto-refreshes every 30 seconds via React Query
 * ZERO business logic — only renders backend data
 */
export default function MapPage() {
  const [selectedHub, setSelectedHub] = useState<Hub | null>(null);
  const [showRoutes, setShowRoutes] = useState(true);

  const {
    data: hubsData,
    isLoading: hubsLoading,
    error: hubsError,
  } = useQuery({
    queryKey: ['hubs'],
    queryFn: hubsApi.list,
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
  });

  const {
    data: shipmentsData,
    isLoading: shipmentsLoading,
  } = useQuery({
    queryKey: ['shipments', { status: 'in_transit' }],
    queryFn: () => shipmentsApi.list({ status: 'in_transit' }),
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
  });

  const hubs = useMemo(() => hubsData?.hubs ?? [], [hubsData?.hubs]);
  const shipments = useMemo(() => shipmentsData?.shipments ?? [], [shipmentsData?.shipments]);

  const hubCoords = useMemo(
    () =>
      new Map<number, [number, number]>(
        hubs.map((hub) => [hub.id, [Number(hub.latitude), Number(hub.longitude)]]),
      ),
    [hubs],
  );

  const routeOverlays = useMemo(
    () =>
      shipments.flatMap((shipment: ShipmentListItem) => {
        const overlays: Array<{ key: string; positions: [number, number][]; isActive: boolean }> = [];

        if (shipment.plannedRoute && shipment.plannedRoute.length > 1) {
          overlays.push({
            key: `${shipment.id}-planned`,
            positions: routePositions(hubCoords, shipment.plannedRoute),
            isActive: false,
          });
        }

        if (
          shipment.activeRoute &&
          shipment.activeRoute.length > 1 &&
          shipment.activeRoute.join(',') !== shipment.plannedRoute?.join(',')
        ) {
          overlays.push({
            key: `${shipment.id}-active`,
            positions: routePositions(hubCoords, shipment.activeRoute),
            isActive: true,
          });
        }

        return overlays;
      }),
    [shipments, hubCoords],
  );

  const handleToggleRoutes = useCallback(() => {
    setShowRoutes((prev) => !prev);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedHub(null);
  }, []);

  if (hubsLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900">
        <Loader2 className="w-12 h-12 animate-spin text-blue-400 mb-4" />
        <p className="text-slate-400 text-sm">Loading map data...</p>
      </div>
    );
  }

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
      <MapContainer>
        {hubs.map((hub) => (
          <HubMarker key={hub.id} hub={hub} onClick={setSelectedHub} />
        ))}

        {showRoutes &&
          !shipmentsLoading &&
          routeOverlays.map((overlay) => (
            <RoutePolyline
              key={overlay.key}
              positions={overlay.positions}
              isActive={overlay.isActive}
            />
          ))}
      </MapContainer>

      <div className="absolute top-4 left-4 z-[1000]">
        <MapToolbar showRoutes={showRoutes} onToggleRoutes={handleToggleRoutes} />
      </div>

      <div className="absolute bottom-4 left-4 z-[1000]">
        <RiskLegend />
      </div>

      {selectedHub && <HubDetailPanel hub={selectedHub} onClose={handleClosePanel} />}

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
