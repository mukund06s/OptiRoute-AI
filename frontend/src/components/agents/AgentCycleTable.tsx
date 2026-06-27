'use client';

import { Eye } from 'lucide-react';
import type { AgentCycleSummary } from '@/lib/api';
import { agentStatusBadgeClass, cn, formatDateTime, titleCase } from '@/lib/utils';
import { formatDurationMs } from './agentFields';

interface AgentCycleTableProps {
  cycles: AgentCycleSummary[];
  loading?: boolean;
  onView: (cycle: AgentCycleSummary) => void;
}

export function AgentCycleTable({ cycles, loading, onView }: AgentCycleTableProps) {
  if (loading) {
    return <AgentCycleTableSkeleton />;
  }

  const agentColumns = [
    { key: 'supervisorStatus', label: 'Supervisor' },
    { key: 'weatherStatus', label: 'Weather' },
    { key: 'riskStatus', label: 'Risk' },
    { key: 'routingStatus', label: 'Routing' },
    { key: 'communicationStatus', label: 'Communication' },
  ] as const;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800/80 border-b border-slate-700/60">
            {[
              'Cycle ID',
              'Execution Time',
              'Status',
              ...agentColumns.map((c) => c.label),
              'Duration',
              'Warnings',
              'Errors',
              'Actions',
            ].map((col) => (
              <th
                key={col}
                className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/40">
          {cycles.map((cycle) => (
            <tr
              key={cycle.cycleId}
              className="bg-[#1E293B]/40 hover:bg-slate-800/60 transition-colors cursor-pointer"
              onClick={() => onView(cycle)}
            >
              <td className="px-3 py-3 font-data text-slate-200 whitespace-nowrap">
                {cycle.cycleId.slice(0, 12)}…
              </td>
              <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">
                {formatDateTime(cycle.executionTime)}
              </td>
              <td className="px-3 py-3">
                <AgentStatusPill status={cycle.status} />
              </td>
              {agentColumns.map(({ key }) => (
                <td key={key} className="px-3 py-3">
                  <AgentStatusPill status={cycle[key]} compact />
                </td>
              ))}
              <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                {formatDurationMs(cycle.durationMs)}
              </td>
              <td className="px-3 py-3 text-xs text-slate-400">
                {cycle.warnings.length || '—'}
              </td>
              <td className="px-3 py-3 text-xs text-red-400">
                {cycle.errors.length || '—'}
              </td>
              <td className="px-3 py-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(cycle);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-blue-400 hover:bg-blue-500/10 border border-blue-500/20 transition-colors"
                >
                  <Eye size={12} />
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentStatusPill({ status, compact }: { status: string; compact?: boolean }) {
  if (status === '—') {
    return <span className="text-xs text-slate-600">—</span>;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold uppercase',
        compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5',
        agentStatusBadgeClass(status),
      )}
    >
      {titleCase(status)}
    </span>
  );
}

function AgentCycleTableSkeleton() {
  return (
    <div className="rounded-xl border border-slate-700/60 overflow-hidden">
      <div className="h-10 bg-slate-800/80 border-b border-slate-700/60" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 border-b border-slate-700/40 bg-slate-800/30 animate-pulse" />
      ))}
    </div>
  );
}
