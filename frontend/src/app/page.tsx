'use client';

/**
 * Dashboard page — Phase 9B
 * Displays live data via React Query hooks consuming backend APIs.
 * ZERO business logic: only renders data returned by the API.
 */

import { useQuery } from '@tanstack/react-query';
import {
  dashboardApi,
  alertsApi,
} from '@/lib/api';
import { StatCard }            from '@/components/dashboard/StatCard';
import { RecentActivityPanel } from '@/components/dashboard/RecentActivityPanel';
import { WorkflowStatusPanel } from '@/components/dashboard/WorkflowStatusPanel';
import { SystemHealthPanel }   from '@/components/dashboard/SystemHealthPanel';
import {
  Package,
  Route,
  MapPin,
  Bell,
} from 'lucide-react';

const STALE = 30_000;
const REFETCH = 30_000;

export default function DashboardPage() {
  /* ---- data fetching (no business logic) ---- */
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useQuery({
    queryKey:        ['dashboard', 'summary'],
    queryFn:         () => dashboardApi.summary(),
    staleTime:       STALE,
    refetchInterval: REFETCH,
  });

  const {
    data: alertStats,
    isLoading: alertsLoading,
    isError: alertsError,
  } = useQuery({
    queryKey:        ['alerts', 'stats'],
    queryFn:         () => alertsApi.stats(),
    staleTime:       STALE,
    refetchInterval: REFETCH,
  });

  /* ---- render ---- */
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Overview</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Real-time logistics monitoring · auto-refreshes every 30 s
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Active Shipments"
          value={summary?.activeShipments}
          icon={Package}
          iconColor="text-blue-400"
          loading={summaryLoading}
          error={summaryError}
        />
        <StatCard
          label="Rerouted Today"
          value={summary?.reroutedToday}
          icon={Route}
          iconColor="text-yellow-400"
          loading={summaryLoading}
          error={summaryError}
        />
        <StatCard
          label="At-Risk Hubs"
          value={summary?.atRiskHubs}
          icon={MapPin}
          iconColor="text-orange-400"
          loading={summaryLoading}
          error={summaryError}
        />
        <StatCard
          label="Alerts Sent Today"
          value={alertStats?.today_count}
          icon={Bell}
          iconColor="text-red-400"
          loading={alertsLoading}
          error={alertsError}
        />
      </div>

      {/* Main 2-column row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent route changes — spans 2 cols */}
        <div className="lg:col-span-2">
          <RecentActivityPanel />
        </div>

        {/* Agent / system health */}
        <div>
          <SystemHealthPanel />
        </div>
      </div>

      {/* Workflow executions row */}
      <WorkflowStatusPanel />
    </div>
  );
}
