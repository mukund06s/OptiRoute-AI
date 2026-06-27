'use client';

import { useQuery } from '@tanstack/react-query';
import { agentsApi, dashboardApi } from '@/lib/api';
import { AgentStatusBar } from './AgentStatusBar';
import {
  Shield,
  Package,
  AlertTriangle,
} from 'lucide-react';

export function SystemHealthPanel() {
  const { data: agentStatus, isLoading: agentLoading, isError: agentError } = useQuery({
    queryKey:        ['agents', 'status'],
    queryFn:         () => agentsApi.status(),
    staleTime:       30_000,
    refetchInterval: 30_000,
    retry:           false,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey:        ['dashboard', 'summary'],
    queryFn:         () => dashboardApi.summary(),
    staleTime:       30_000,
    refetchInterval: 30_000,
  });

  const criticalHubs = summary?.criticalHubs ?? [];

  return (
    <div className="rounded-xl bg-[#1E293B] border border-slate-700/60 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-700/60">
        <Shield size={14} className="text-green-400" />
        <div>
          <p className="text-sm font-semibold text-slate-200">Agent Status</p>
          <p className="text-xs text-slate-500 mt-0.5">Last run · Next run · Health</p>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Agent status bar */}
        <AgentStatusBar
          status={agentStatus}
          loading={agentLoading}
          error={agentError}
        />

        {/* Critical hubs */}
        {(criticalHubs.length > 0 || summaryLoading) && (
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2 px-1">
              Critical Hubs
            </p>
            <div className="space-y-1.5">
              {summaryLoading
                ? Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-8 rounded bg-slate-700/40 animate-pulse" />
                  ))
                : criticalHubs.slice(0, 3).map((hub) => (
                    <div
                      key={hub.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <AlertTriangle size={12} className="text-red-400 shrink-0" />
                      <span className="text-xs text-red-300 truncate">{hub.name}</span>
                      <span className="ml-auto text-[10px] text-red-500">{hub.city}</span>
                    </div>
                  ))}
            </div>
          </div>
        )}

        {/* At-risk stat */}
        {!summaryLoading && summary && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/40">
            <div className="flex items-center gap-2">
              <Package size={13} className="text-blue-400" />
              <span className="text-xs text-slate-500">Active shipments</span>
            </div>
            <span className="text-xs font-semibold font-data text-slate-300">
              {summary.activeShipments}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
