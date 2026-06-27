'use client';

import { Clock, CheckCircle, XCircle, AlertTriangle, Bot } from 'lucide-react';
import type { AlertItem } from '@/lib/api';
import { formatDateTime, titleCase } from '@/lib/utils';

interface AlertTimelineProps {
  alert: AlertItem;
  loading?: boolean;
}

export function AlertTimeline({ alert, loading }: AlertTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-slate-700/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const events = buildTimelineEvents(alert);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Clock size={20} className="text-slate-600" />
        <p className="text-sm text-slate-500">No timeline events available</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {events.map((event, index) => {
        const Icon = event.icon;
        return (
        <div key={event.id} className="relative pl-6 pb-5 last:pb-0">
          {index < events.length - 1 && (
            <span className="absolute left-[7px] top-3 bottom-0 w-px bg-slate-700" />
          )}
          <span className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center">
            <Icon size={8} className="text-blue-400" />
          </span>

          <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3 space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-200">{event.title}</span>
              <span className="text-[11px] text-slate-500">{formatDateTime(event.timestamp)}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{event.description}</p>
          </div>
        </div>
        );
      })}
    </div>
  );
}

function buildTimelineEvents(alert: AlertItem) {
  const events: Array<{
    id: string;
    title: string;
    description: string;
    timestamp: string;
    icon: typeof Clock;
  }> = [];

  if (alert.routeChange?.reason) {
    events.push({
      id: 'route-change',
      title: 'Route Change Triggered',
      description: alert.routeChange.reason,
      timestamp: alert.sentAt,
      icon: AlertTriangle,
    });
  }

  if (alert.isAnomalyAlert) {
    events.push({
      id: 'anomaly',
      title: 'Anomaly Detected',
      description:
        typeof alert.anomalyDetails === 'object' && alert.anomalyDetails
          ? JSON.stringify(alert.anomalyDetails)
          : 'Multi-hub anomaly flagged by communication agent',
      timestamp: alert.sentAt,
      icon: Bot,
    });
  }

  events.push({
    id: `status-${alert.status}`,
    title: `Delivery: ${titleCase(alert.status)}`,
    description: `Alert dispatched via ${titleCase(alert.channel)}${
      alert.recipient ? ` to ${alert.recipient}` : ''
    }`,
    timestamp: alert.sentAt,
    icon: alert.status === 'sent' ? CheckCircle : alert.status === 'failed' ? XCircle : Clock,
  });

  return events;
}
