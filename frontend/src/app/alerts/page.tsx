'use client';

/**
 * Alerts Page — Phase 9E
 * Displays alert list with search, filters, statistics, and detail drawer.
 * ZERO business logic: only renders and filters backend data.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, AlertCircle } from 'lucide-react';
import { alertsApi, type AlertItem } from '@/lib/api';
import {
  AlertsTable,
  AlertDrawer,
  AlertFilters,
  AlertSearch,
  AlertStatistics,
  type AlertFilterValues,
} from '@/components/alerts';
import {
  readAlertRiskLevel,
  readAlertSeverity,
  readAlertHubLabel,
  readAlertSourceAgent,
  readAlertTrackingId,
} from '@/components/alerts/alertFields';

const STALE = 30_000;
const REFETCH = 30_000;

export default function AlertsPage() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<AlertFilterValues>({
    severity: '',
    risk: '',
    acknowledged: '',
    agent: '',
  });
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const apiParams = {
    status: filters.acknowledged || undefined,
  };

  const {
    data: alertsData,
    isLoading: alertsLoading,
    isError: alertsError,
    error: alertsErrorObj,
  } = useQuery({
    queryKey: ['alerts', apiParams],
    queryFn: () => alertsApi.list(apiParams),
    staleTime: STALE,
    refetchInterval: REFETCH,
  });

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({
    queryKey: ['alerts', 'stats'],
    queryFn: () => alertsApi.stats(),
    staleTime: STALE,
    refetchInterval: REFETCH,
    retry: false,
  });

  const alerts = useMemo(() => alertsData?.alerts ?? [], [alertsData?.alerts]);

  const anomalyCount = useMemo(
    () => alerts.filter((a) => a.isAnomalyAlert).length,
    [alerts],
  );

  const filteredAlerts = useMemo(() => {
    let list = alerts;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((alert) => {
        const severity = readAlertSeverity(alert);
        return (
          String(alert.id).includes(q) ||
          readAlertTrackingId(alert).toLowerCase().includes(q) ||
          readAlertHubLabel(alert).toLowerCase().includes(q) ||
          severity.toLowerCase().includes(q)
        );
      });
    }

    if (filters.severity) {
      list = list.filter((alert) => readAlertSeverity(alert) === filters.severity);
    }

    if (filters.risk) {
      list = list.filter((alert) => readAlertRiskLevel(alert) === filters.risk);
    }

    if (filters.acknowledged) {
      list = list.filter((alert) => alert.status === filters.acknowledged);
    }

    if (filters.agent) {
      list = list.filter((alert) => {
        const agent = readAlertSourceAgent(alert);
        return agent?.toLowerCase() === filters.agent.toLowerCase();
      });
    }

    return list;
  }, [alerts, search, filters]);

  const handleView = (alert: AlertItem) => {
    setSelectedAlert(alert);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedAlert(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Alerts & Monitoring</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Notification log and delivery status · auto-refreshes every 30 s
        </p>
      </div>

      <AlertStatistics
        stats={stats}
        anomalyCount={anomalyCount}
        loading={statsLoading && alertsLoading}
        error={statsError && alertsError}
      />

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 rounded-xl bg-[#1E293B] border border-slate-700/60">
        <AlertSearch value={search} onChange={setSearch} />
        <AlertFilters values={filters} onChange={setFilters} />
      </div>

      {alertsError && (
        <div className="flex flex-col items-center gap-3 py-12 rounded-xl bg-[#1E293B] border border-red-500/20">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-sm font-medium text-slate-300">Failed to load alerts</p>
          <p className="text-xs text-slate-500">
            {alertsErrorObj instanceof Error ? alertsErrorObj.message : 'Unknown error'}
          </p>
        </div>
      )}

      {!alertsLoading && !alertsError && filteredAlerts.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl bg-[#1E293B] border border-slate-700/60">
          <Bell size={32} className="text-slate-600" />
          <p className="text-sm font-medium text-slate-400">No alerts found</p>
          <p className="text-xs text-slate-600">
            {search || filters.severity || filters.risk || filters.acknowledged || filters.agent
              ? 'Try adjusting your search or filters'
              : 'Alerts appear here when the communication agent sends notifications'}
          </p>
        </div>
      )}

      {!alertsError && (alertsLoading || filteredAlerts.length > 0) && (
        <div>
          {!alertsLoading && (
            <p className="text-xs text-slate-500 mb-3">
              Showing {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
            </p>
          )}
          <AlertsTable
            alerts={filteredAlerts}
            loading={alertsLoading}
            onView={handleView}
          />
        </div>
      )}

      <AlertDrawer alert={selectedAlert} open={drawerOpen} onClose={handleCloseDrawer} />
    </div>
  );
}
