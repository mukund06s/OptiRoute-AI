'use client';

/**
 * Agents Page — Phase 9F
 * Agent monitoring dashboard: status, performance, cycle history, log viewer.
 * ZERO business logic: only renders backend data. Does NOT execute agents/workflows.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, AlertCircle, Activity, Clock, HeartPulse, Timer } from 'lucide-react';
import {
  agentsApi,
  workflowApi,
  type AgentCycleSummary,
} from '@/lib/api';
import {
  AgentCycleTable,
  AgentExecutionDrawer,
  AgentStatusCard,
  AgentPerformancePanel,
} from '@/components/agents';
import {
  buildCyclesFromLogs,
  buildCyclesFromWorkflows,
  mergeCycleSummaries,
  computePerformanceFromLogs,
  formatDurationMs,
} from '@/components/agents/agentFields';
import { formatDateTime, timeAgo, titleCase } from '@/lib/utils';

const STALE = 30_000;
const REFETCH = 30_000;

export default function AgentsPage() {
  const [selectedCycle, setSelectedCycle] = useState<AgentCycleSummary | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    data: agentStatus,
    isLoading: statusLoading,
    isError: statusError,
  } = useQuery({
    queryKey: ['agents', 'status'],
    queryFn: () => agentsApi.status(),
    staleTime: STALE,
    refetchInterval: REFETCH,
    retry: false,
  });

  const {
    data: logsData,
    isLoading: logsLoading,
    isError: logsError,
  } = useQuery({
    queryKey: ['agents', 'logs'],
    queryFn: () => agentsApi.logs(),
    staleTime: STALE,
    refetchInterval: REFETCH,
    retry: false,
  });

  const {
    data: workflowHistory,
    isLoading: workflowLoading,
    isError: workflowError,
  } = useQuery({
    queryKey: ['workflow', 'history'],
    queryFn: () => workflowApi.history({ limit: 50 }),
    staleTime: STALE,
    refetchInterval: REFETCH,
    retry: false,
  });

  const logs = useMemo(() => logsData?.logs ?? [], [logsData?.logs]);
  const workflows = useMemo(
    () => workflowHistory?.workflows ?? [],
    [workflowHistory?.workflows],
  );

  const cycles = useMemo(
    () =>
      mergeCycleSummaries(
        buildCyclesFromLogs(logs),
        buildCyclesFromWorkflows(workflows),
      ),
    [logs, workflows],
  );

  const performance = useMemo(() => computePerformanceFromLogs(logs), [logs]);

  const avgDuration =
    agentStatus?.averageExecutionTimeMs != null
      ? formatDurationMs(agentStatus.averageExecutionTimeMs)
      : performance
        ? formatDurationMs(performance.averageDurationMs)
        : '—';

  const handleView = (cycle: AgentCycleSummary) => {
    setSelectedCycle(cycle);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedCycle(null);
  };

  const isLoading = statusLoading || logsLoading || workflowLoading;
  const isError = statusError && logsError && workflowError;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Agent Monitor</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Multi-agent pipeline observability · auto-refreshes every 30 s
        </p>
      </div>

      {/* Status panel */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">System Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          <AgentStatusCard
            label="Availability"
            value={agentStatus?.isRunning ? 'Online' : 'Offline'}
            icon={Activity}
            iconColor={agentStatus?.isRunning ? 'text-green-400' : 'text-slate-500'}
            loading={statusLoading}
            error={statusError}
          />
          <AgentStatusCard
            label="Health"
            value={agentStatus?.health ? titleCase(agentStatus.health) : '—'}
            icon={HeartPulse}
            iconColor="text-green-400"
            loading={statusLoading}
            error={statusError}
          />
          <AgentStatusCard
            label="Last Run"
            value={agentStatus?.lastRun ? timeAgo(agentStatus.lastRun) : '—'}
            icon={Clock}
            iconColor="text-slate-400"
            loading={statusLoading}
            error={statusError}
          />
          <AgentStatusCard
            label="Next Scheduled"
            value={agentStatus?.nextRun ? formatDateTime(agentStatus.nextRun) : '—'}
            icon={Bot}
            iconColor="text-blue-400"
            loading={statusLoading}
            error={statusError}
          />
          <AgentStatusCard
            label="Avg Execution"
            value={avgDuration}
            icon={Timer}
            iconColor="text-yellow-400"
            loading={statusLoading && logsLoading}
            error={statusError && logsError}
          />
        </div>
      </div>

      {/* Performance */}
      <AgentPerformancePanel
        metrics={performance}
        loading={logsLoading}
        error={logsError}
      />

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center gap-3 py-12 rounded-xl bg-[#1E293B] border border-red-500/20">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-sm font-medium text-slate-300">Failed to load agent data</p>
          <p className="text-xs text-slate-500">
            Agent APIs may not be available until backend routes are implemented
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && cycles.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl bg-[#1E293B] border border-slate-700/60">
          <Bot size={32} className="text-slate-600" />
          <p className="text-sm font-medium text-slate-400">No agent cycles recorded</p>
          <p className="text-xs text-slate-600">
            Cycles appear here after agent pipeline executions
          </p>
        </div>
      )}

      {/* Cycle table */}
      {!isError && (isLoading || cycles.length > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Execution History</h3>
          {!isLoading && (
            <p className="text-xs text-slate-500 mb-3">
              {cycles.length} cycle{cycles.length !== 1 ? 's' : ''}
            </p>
          )}
          <AgentCycleTable cycles={cycles} loading={isLoading} onView={handleView} />
        </div>
      )}

      <AgentExecutionDrawer
        cycle={selectedCycle}
        open={drawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
