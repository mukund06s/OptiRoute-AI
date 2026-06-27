'use client';

import { ArrowRight, AlertTriangle } from 'lucide-react';
import { cn, timeAgo, riskBadgeClass, titleCase } from '@/lib/utils';
import type { RouteChange } from '@/lib/api';

interface RouteChangeRowProps {
  change: RouteChange;
}

export function RouteChangeRow({ change }: RouteChangeRowProps) {
  const riskKeyword = extractRiskKeyword(change.reason);

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/40 transition-colors">
      {/* Indicator */}
      <AlertTriangle size={14} className="text-yellow-400 shrink-0" />

      {/* Tracking ID */}
      <span className="text-xs font-medium text-slate-300 font-data shrink-0 w-28 truncate">
        {change.tracking_id}
      </span>

      {/* Route change */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 text-xs text-slate-500">
        <span className="text-slate-400 truncate">{formatRoute(change.old_route)}</span>
        <ArrowRight size={11} className="text-slate-600 shrink-0" />
        <span className="text-blue-400 truncate">{formatRoute(change.new_route)}</span>
      </div>

      {/* Risk badge */}
      {riskKeyword && (
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full shrink-0', riskBadgeClass(riskKeyword))}>
          {titleCase(riskKeyword)}
        </span>
      )}

      {/* Time */}
      <span className="text-[11px] text-slate-600 shrink-0">
        {timeAgo(change.created_at)}
      </span>
    </div>
  );
}

function formatRoute(ids: number[]): string {
  if (!ids?.length) return '—';
  return ids.slice(0, 2).join(' → ') + (ids.length > 2 ? ` +${ids.length - 2}` : '');
}

function extractRiskKeyword(reason: string): string {
  if (!reason) return '';
  const r = reason.toLowerCase();
  if (r.includes('critical')) return 'critical';
  if (r.includes('high'))     return 'high';
  if (r.includes('medium'))   return 'medium';
  return 'low';
}
