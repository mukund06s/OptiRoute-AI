'use client';

import { TrendingUp, TrendingDown, Timer, Zap, Snail } from 'lucide-react';
import type { AgentPerformanceMetrics } from './agentFields';
import { formatDurationMs } from './agentFields';

interface AgentPerformancePanelProps {
  metrics: AgentPerformanceMetrics | null;
  loading?: boolean;
  error?: boolean;
}

export function AgentPerformancePanel({ metrics, loading, error }: AgentPerformancePanelProps) {
  const cards = [
    {
      label: 'Success Rate',
      value: metrics ? `${metrics.successRate.toFixed(1)}%` : '—',
      icon: TrendingUp,
      color: 'text-green-400',
    },
    {
      label: 'Failure Rate',
      value: metrics ? `${metrics.failureRate.toFixed(1)}%` : '—',
      icon: TrendingDown,
      color: 'text-red-400',
    },
    {
      label: 'Avg Duration',
      value: metrics ? formatDurationMs(metrics.averageDurationMs) : '—',
      icon: Timer,
      color: 'text-blue-400',
    },
    {
      label: 'Fastest Agent',
      value: metrics?.fastestAgent ?? '—',
      icon: Zap,
      color: 'text-yellow-400',
    },
    {
      label: 'Slowest Agent',
      value: metrics?.slowestAgent ?? '—',
      icon: Snail,
      color: 'text-orange-400',
    },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-200 mb-3">Agent Performance</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex flex-col gap-2 p-4 rounded-xl bg-[#1E293B] border border-slate-700/60"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                {label}
              </span>
              <Icon size={14} className={color} />
            </div>
            {loading ? (
              <div className="h-6 w-16 rounded bg-slate-700/60 animate-pulse" />
            ) : error ? (
              <span className="text-base font-bold text-slate-600">—</span>
            ) : (
              <span className="text-base font-bold text-slate-100 font-data capitalize">
                {value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
