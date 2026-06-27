'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { RouteChangeRow } from './RouteChangeRow';
import { ArrowLeftRight, XCircle } from 'lucide-react';

export function RecentActivityPanel() {
  const { data, isLoading, isError } = useQuery({
    queryKey:        ['dashboard', 'summary'],
    queryFn:         () => dashboardApi.summary(),
    staleTime:       30_000,
    refetchInterval: 30_000,
  });

  const changes = data?.recentRouteChanges ?? [];

  return (
    <div className="rounded-xl bg-[#1E293B] border border-slate-700/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <ArrowLeftRight size={14} className="text-yellow-400" />
          <div>
            <p className="text-sm font-semibold text-slate-200">Recent Route Changes</p>
            <p className="text-xs text-slate-500 mt-0.5">Last 10 reroute events</p>
          </div>
        </div>
        {!isLoading && (
          <span className="text-xs text-slate-500 font-data">
            {changes.length} event{changes.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="p-4 space-y-2">
        {isLoading && (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-slate-700/40 animate-pulse" />
            ))}
          </>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-2 py-8">
            <XCircle size={20} className="text-red-400" />
            <p className="text-sm text-slate-500">Could not load recent activity</p>
          </div>
        )}

        {!isLoading && !isError && changes.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8">
            <ArrowLeftRight size={20} className="text-slate-600" />
            <p className="text-sm text-slate-500">No route changes yet</p>
            <p className="text-xs text-slate-600">Route changes appear here when the agent reroutes shipments</p>
          </div>
        )}

        {!isLoading && !isError && changes.map((change) => (
          <RouteChangeRow key={change.id} change={change} />
        ))}
      </div>
    </div>
  );
}
