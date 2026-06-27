import type {
  AgentCycleSummary,
  AgentLogItem,
  WorkflowHistoryItem,
} from '@/lib/api';

/** Read cycle ID stored in backend log JSON fields */
export function readCycleIdFromLog(log: AgentLogItem): string | null {
  const fromInput = log.inputData?.cycleId ?? log.inputData?.cycle_id;
  const fromOutput = log.outputData?.cycleId ?? log.outputData?.cycle_id;
  if (fromInput != null) return String(fromInput);
  if (fromOutput != null) return String(fromOutput);
  return null;
}

function readAgentStatus(logs: AgentLogItem[], agentName: string): string {
  const match = logs.find((log) => log.agentName?.toLowerCase() === agentName);
  return match?.status ?? '—';
}

function sumDuration(logs: AgentLogItem[]): number | null {
  const durations = logs
    .map((log) => log.durationMs)
    .filter((ms): ms is number => ms != null);
  if (durations.length === 0) return null;
  return durations.reduce((sum, ms) => sum + ms, 0);
}

/** Build cycle summaries from backend agent logs */
export function buildCyclesFromLogs(logs: AgentLogItem[]): AgentCycleSummary[] {
  const grouped = new Map<string, AgentLogItem[]>();

  for (const log of logs) {
    const cycleId = readCycleIdFromLog(log);
    if (!cycleId) continue;
    const existing = grouped.get(cycleId) ?? [];
    existing.push(log);
    grouped.set(cycleId, existing);
  }

  return Array.from(grouped.entries()).map(([cycleId, cycleLogs]) => {
    const sorted = [...cycleLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const latest = sorted[0];
    const errors = cycleLogs
      .map((log) => log.errorMessage)
      .filter((msg): msg is string => Boolean(msg));

    return {
      cycleId,
      executionTime: latest.createdAt,
      status: latest.status ?? 'unknown',
      supervisorStatus: readAgentStatus(cycleLogs, 'supervisor'),
      weatherStatus: readAgentStatus(cycleLogs, 'weather'),
      riskStatus: readAgentStatus(cycleLogs, 'risk'),
      routingStatus: readAgentStatus(cycleLogs, 'routing'),
      communicationStatus: readAgentStatus(cycleLogs, 'communication'),
      durationMs: sumDuration(cycleLogs),
      warnings: [],
      errors,
    };
  });
}

/** Build cycle summaries from backend workflow history */
export function buildCyclesFromWorkflows(workflows: WorkflowHistoryItem[]): AgentCycleSummary[] {
  return workflows.map((workflow) => ({
    cycleId: workflow.cycleId,
    workflowId: workflow.workflowId,
    executionTime: workflow.updatedAt ?? workflow.createdAt ?? new Date().toISOString(),
    status: workflow.state,
    supervisorStatus: '—',
    weatherStatus: '—',
    riskStatus: '—',
    routingStatus: '—',
    communicationStatus: '—',
    durationMs: null,
    warnings: [],
    errors: workflow.failedSteps > 0 ? [`${workflow.failedSteps} failed step(s)`] : [],
  }));
}

/** Merge cycle lists by cycleId — prefer log-based rows, enrich with workflowId */
export function mergeCycleSummaries(
  fromLogs: AgentCycleSummary[],
  fromWorkflows: AgentCycleSummary[],
): AgentCycleSummary[] {
  const map = new Map<string, AgentCycleSummary>();

  for (const cycle of fromLogs) {
    map.set(cycle.cycleId, cycle);
  }

  for (const workflowCycle of fromWorkflows) {
    const existing = map.get(workflowCycle.cycleId);
    if (existing) {
      map.set(workflowCycle.cycleId, {
        ...existing,
        workflowId: workflowCycle.workflowId ?? existing.workflowId,
        status: workflowCycle.status || existing.status,
        errors: [...existing.errors, ...workflowCycle.errors],
      });
    } else {
      map.set(workflowCycle.cycleId, workflowCycle);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.executionTime).getTime() - new Date(a.executionTime).getTime(),
  );
}

export interface AgentPerformanceMetrics {
  successRate: number;
  failureRate: number;
  averageDurationMs: number;
  slowestAgent: string;
  fastestAgent: string;
}

/** Aggregate performance metrics from backend agent logs */
export function computePerformanceFromLogs(logs: AgentLogItem[]): AgentPerformanceMetrics | null {
  if (logs.length === 0) return null;

  const success = logs.filter((log) => log.status === 'success').length;
  const failed = logs.filter((log) => log.status === 'error').length;
  const total = logs.length;

  const durationsByAgent = new Map<string, number[]>();
  for (const log of logs) {
    if (log.durationMs == null) continue;
    const key = log.agentName?.toLowerCase() ?? 'unknown';
    const list = durationsByAgent.get(key) ?? [];
    list.push(log.durationMs);
    durationsByAgent.set(key, list);
  }

  const agentAverages = Array.from(durationsByAgent.entries()).map(([agent, durations]) => ({
    agent,
    avg: durations.reduce((sum, ms) => sum + ms, 0) / durations.length,
  }));

  const allDurations = logs
    .map((log) => log.durationMs)
    .filter((ms): ms is number => ms != null);
  const averageDurationMs =
    allDurations.length > 0
      ? allDurations.reduce((sum, ms) => sum + ms, 0) / allDurations.length
      : 0;

  const sortedAgents = [...agentAverages].sort((a, b) => b.avg - a.avg);

  return {
    successRate: total > 0 ? (success / total) * 100 : 0,
    failureRate: total > 0 ? (failed / total) * 100 : 0,
    averageDurationMs,
    slowestAgent: sortedAgents[0]?.agent ?? '—',
    fastestAgent: sortedAgents[sortedAgents.length - 1]?.agent ?? '—',
  };
}

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
