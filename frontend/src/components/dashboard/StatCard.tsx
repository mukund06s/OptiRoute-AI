'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label:     string;
  value:     number | string | null | undefined;
  icon:      LucideIcon;
  iconColor: string;
  loading?:  boolean;
  error?:    boolean;
  /** Optional badge shown below value (e.g. "↑ 3 since yesterday") */
  trend?:    string;
  trendUp?:  boolean;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  loading,
  error,
  trend,
  trendUp,
}: StatCardProps) {
  return (
    <div className="flex flex-col gap-4 p-5 rounded-xl bg-[#1E293B] border border-slate-700/60 hover:border-slate-600 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </span>
        <div className={cn('p-2 rounded-lg', `${iconColor}/10`)}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>

      {/* Value */}
      {loading ? (
        <div className="h-8 w-16 rounded-md bg-slate-700/60 animate-pulse" />
      ) : error ? (
        <span className="text-2xl font-bold text-slate-600">—</span>
      ) : (
        <span className="text-3xl font-bold text-slate-100 font-data tabular-nums">
          {value ?? 0}
        </span>
      )}

      {/* Trend badge */}
      {trend && !loading && !error && (
        <span
          className={cn(
            'text-xs font-medium',
            trendUp ? 'text-green-400' : 'text-red-400',
          )}
        >
          {trend}
        </span>
      )}
    </div>
  );
}
