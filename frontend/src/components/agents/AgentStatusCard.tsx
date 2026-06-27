'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentStatusCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconColor?: string;
  loading?: boolean;
  error?: boolean;
}

export function AgentStatusCard({
  label,
  value,
  icon: Icon,
  iconColor = 'text-blue-400',
  loading,
  error,
}: AgentStatusCardProps) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#1E293B] border border-slate-700/60">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </span>
        <Icon size={14} className={iconColor} />
      </div>
      {loading ? (
        <div className="h-7 w-20 rounded bg-slate-700/60 animate-pulse" />
      ) : error ? (
        <span className="text-lg font-bold text-slate-600">—</span>
      ) : (
        <span className={cn('text-lg font-bold text-slate-100 font-data tabular-nums')}>
          {value}
        </span>
      )}
    </div>
  );
}
