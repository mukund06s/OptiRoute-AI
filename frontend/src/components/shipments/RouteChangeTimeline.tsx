'use client';

import { ArrowRight, Clock } from 'lucide-react';
import type { ShipmentRouteChange } from '@/lib/api';
import { cn, formatDateTime, riskBadgeClass, titleCase } from '@/lib/utils';

interface RouteChangeTimelineProps {
  changes: ShipmentRouteChange[];
  loading?: boolean;
}

export function RouteChangeTimeline({ changes, loading }: RouteChangeTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-slate-700/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Clock size={20} className="text-slate-600" />
        <p className="text-sm text-slate-500">No route changes recorded</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {changes.map((change, index) => (
        <div key={change.id} className="relative pl-6 pb-6 last:pb-0">
          {index < changes.length - 1 && (
            <span className="absolute left-[7px] top-3 bottom-0 w-px bg-slate-700" />
          )}
          <span className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-blue-500/20 border-2 border-blue-400" />

          <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-slate-400">{formatDateTime(change.createdAt)}</span>
              {change.riskLevelTriggered && (
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold',
                    riskBadgeClass(change.riskLevelTriggered),
                  )}
                >
                  {titleCase(change.riskLevelTriggered)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
              <span>{formatRouteNames(change.oldRouteNames)}</span>
              <ArrowRight size={11} className="text-slate-600 shrink-0" />
              <span className="text-blue-400">{formatRouteNames(change.newRouteNames)}</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{change.reason}</p>

            {change.agentDecisionLog && (
              <p className="text-[11px] text-slate-500 italic border-t border-slate-700/50 pt-2">
                {change.agentDecisionLog}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatRouteNames(names: string[] | null): string {
  if (!names?.length) return '—';
  return names.join(' → ');
}
