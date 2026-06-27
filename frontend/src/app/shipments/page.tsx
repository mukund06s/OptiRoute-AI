'use client';

/**
 * Shipments Page — Phase 9D
 * Displays shipment list with search, filters, drawer detail, and create modal.
 * ZERO business logic: only renders and filters backend data.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Package, AlertCircle } from 'lucide-react';
import {
  shipmentsApi,
  riskApi,
  type ShipmentListItem,
  type RiskScore,
} from '@/lib/api';
import {
  ShipmentsTable,
  ShipmentDrawer,
  CreateShipmentModal,
  ShipmentFilters,
  ShipmentSearch,
  type ShipmentFilterValues,
} from '@/components/shipments';

const STALE = 30_000;
const REFETCH = 30_000;

export default function ShipmentsPage() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ShipmentFilterValues>({
    status: '',
    priority: '',
    risk: '',
  });
  const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const apiParams = {
    status: filters.status || undefined,
    priority: filters.priority || undefined,
  };

  const {
    data: shipmentsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['shipments', apiParams],
    queryFn: () => shipmentsApi.list(apiParams),
    staleTime: STALE,
    refetchInterval: REFETCH,
  });

  const { data: riskData } = useQuery({
    queryKey: ['risk', 'scores'],
    queryFn: () => riskApi.scores(),
    staleTime: STALE,
    refetchInterval: REFETCH,
    retry: false,
  });

  const riskByHubId = useMemo(() => {
    const map = new Map<number, RiskScore>();
    for (const score of riskData?.scores ?? []) {
      map.set(score.hubId, score);
    }
    return map;
  }, [riskData]);

  const filteredShipments = useMemo(() => {
    let list = shipmentsData?.shipments ?? [];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.trackingId.toLowerCase().includes(q) ||
          s.originHub.city.toLowerCase().includes(q) ||
          s.destinationHub.city.toLowerCase().includes(q) ||
          (s.currentHub?.city.toLowerCase().includes(q) ?? false),
      );
    }

    if (filters.risk) {
      list = list.filter((s) => {
        const hubId = s.currentHubId ?? s.originHubId;
        const risk = riskByHubId.get(hubId);
        return (risk?.riskLevel ?? 'low') === filters.risk;
      });
    }

    return list;
  }, [shipmentsData, search, filters.risk, riskByHubId]);

  const handleView = (shipment: ShipmentListItem) => {
    setSelectedShipmentId(shipment.id);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedShipmentId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Shipments</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage active shipments · auto-refreshes every 30 s
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors self-start"
        >
          <Plus size={16} />
          New Shipment
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 rounded-xl bg-[#1E293B] border border-slate-700/60">
        <ShipmentSearch value={search} onChange={setSearch} />
        <ShipmentFilters values={filters} onChange={setFilters} />
      </div>

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center gap-3 py-12 rounded-xl bg-[#1E293B] border border-red-500/20">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-sm font-medium text-slate-300">Failed to load shipments</p>
          <p className="text-xs text-slate-500">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && filteredShipments.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl bg-[#1E293B] border border-slate-700/60">
          <Package size={32} className="text-slate-600" />
          <p className="text-sm font-medium text-slate-400">No shipments found</p>
          <p className="text-xs text-slate-600">
            {search || filters.status || filters.priority || filters.risk
              ? 'Try adjusting your search or filters'
              : 'Create a new shipment to get started'}
          </p>
        </div>
      )}

      {/* Table */}
      {!isError && (isLoading || filteredShipments.length > 0) && (
        <div>
          {!isLoading && (
            <p className="text-xs text-slate-500 mb-3">
              Showing {filteredShipments.length} shipment{filteredShipments.length !== 1 ? 's' : ''}
            </p>
          )}
          <ShipmentsTable
            shipments={filteredShipments}
            riskByHubId={riskByHubId}
            loading={isLoading}
            onView={handleView}
          />
        </div>
      )}

      {/* Drawer */}
      <ShipmentDrawer
        shipmentId={selectedShipmentId}
        open={drawerOpen}
        onClose={handleCloseDrawer}
      />

      {/* Create modal */}
      <CreateShipmentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
