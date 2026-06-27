'use client';

import { CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import { cn, timeAgo, formatTime } from '@/lib/utils';
import type { AgentStatus } from '@/lib/api';

interface AgentStatusBarProps {
  status?:  AgentStatus;
  loading?: boolean;
  error?:   boolean;
}

export function AgentStatusBar({ status, loading, error }: AgentStatusBarProps) {
  const isOnline = status?.isRunning !== false && !error;

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 rounded bg-slate-700/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Online / offline pill */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            isOnline
              ? 'bg-green-400 shadow-[0_0_8px_#22c55e]'
              : 'bg-slate-600',
          )}
        />
        <span className={cn('text-sm font-medium', isOnline ? 'text-green-400' : 'text-slate-500')}>
          {isOnline ? 'System Online' : 'System Offline'}
        </span>
      </div>

      {/* Rows */}
      <div className="space-y-2">
        <StatusRow
          icon={Clock}
          iconClass="text-slate-500"
          label="Last run"
          value={status?.lastRun ? timeAgo(status.lastRun) : '—'}
        />
        <StatusRow
          icon={Zap}
          iconClass="text-blue-400"
          label="Next run"
          value={status?.nextRun ? formatTime(status.nextRun) : '—'}
        />
        <StatusRow
          icon={isOnline ? CheckCircle2 : XCircle}
          iconClass={isOnline ? 'text-green-400' : 'text-red-400'}
          label="Health"
          value={status?.health ? titleCase(status.health) : (error ? 'Error' : '—')}
          valueClass={isOnline ? 'text-green-400' : 'text-red-400'}
        />
      </div>
    </div>
  );
}

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function StatusRow({
  icon: Icon,
  iconClass,
  label,
  value,
  valueClass,
}: {
  icon: typeof Clock;
  iconClass: string;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/40">
      <div className="flex items-center gap-2">
        <Icon size={13} className={iconClass} />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <span className={cn('text-xs font-medium', valueClass ?? 'text-slate-300')}>{value}</span>
    </div>
  );
}
