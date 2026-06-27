'use client';

import { Bell, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { AlertStats } from '@/lib/api';

interface AlertStatisticsProps {
  stats?: AlertStats;
  anomalyCount?: number;
  loading?: boolean;
  error?: boolean;
}

export function AlertStatistics({ stats, anomalyCount, loading, error }: AlertStatisticsProps) {
  const cards = [
    { label: 'Total Alerts', value: stats?.total, icon: Bell, color: 'text-blue-400' },
    { label: 'Sent', value: stats?.sent, icon: CheckCircle, color: 'text-green-400' },
    { label: 'Failed', value: stats?.failed, icon: XCircle, color: 'text-red-400' },
    { label: 'Today', value: stats?.today_count, icon: Bell, color: 'text-yellow-400' },
    { label: 'Anomaly Alerts', value: anomalyCount, icon: AlertTriangle, color: 'text-purple-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="flex flex-col gap-3 p-4 rounded-xl bg-[#1E293B] border border-slate-700/60"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
              {label}
            </span>
            <Icon size={14} className={color} />
          </div>
          {loading ? (
            <div className="h-7 w-12 rounded bg-slate-700/60 animate-pulse" />
          ) : error ? (
            <span className="text-2xl font-bold text-slate-600">—</span>
          ) : (
            <span className="text-2xl font-bold text-slate-100 font-data tabular-nums">
              {value ?? 0}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
