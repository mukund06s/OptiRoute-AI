'use client';

import { Clock, CheckCircle, XCircle, AlertTriangle, Bot } from 'lucide-react';
import type { AgentLogItem, WorkflowExecutionDetail } from '@/lib/api';
import { formatDateTime, titleCase } from '@/lib/utils';
import { formatDurationMs } from './agentFields';

interface AgentTimelineProps {
  logs: AgentLogItem[];
  workflow?: WorkflowExecutionDetail | null;
  loading?: boolean;
}

export function AgentTimeline({ logs, workflow, loading }: AgentTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-slate-700/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const events = buildTimelineEvents(logs, workflow);

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
                <span className="text-[11px] text-slate-500">
                  {event.timestamp ? formatDateTime(event.timestamp) : '—'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{event.description}</p>
              {event.durationMs != null && (
                <p className="text-[11px] text-slate-500 font-data">
                  Duration: {formatDurationMs(event.durationMs)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function buildTimelineEvents(logs: AgentLogItem[], workflow?: WorkflowExecutionDetail | null) {
  const events: Array<{
    id: string;
    title: string;
    description: string;
    timestamp?: string;
    durationMs?: number | null;
    icon: typeof Clock;
  }> = [];

  if (workflow?.steps?.length) {
    for (const step of workflow.steps) {
      events.push({
        id: `step-${step.agent}`,
        title: `${titleCase(step.agent)} Agent`,
        description: step.error ?? `Step ${step.state}`,
        timestamp: step.completedAt ?? step.startedAt,
        icon:
          step.state === 'completed' || step.state === 'success'
            ? CheckCircle
            : step.state === 'failed' || step.state === 'error'
              ? XCircle
              : Bot,
      });
    }
  }

  for (const log of logs) {
    events.push({
      id: `log-${log.id}`,
      title: `${titleCase(log.agentName)} — ${log.action}`,
      description: log.errorMessage ?? `Status: ${log.status ?? 'unknown'}`,
      timestamp: log.createdAt,
      durationMs: log.durationMs,
      icon:
        log.status === 'success'
          ? CheckCircle
          : log.status === 'error'
            ? XCircle
            : AlertTriangle,
    });
  }

  if (workflow?.errors?.length) {
    for (const [idx, err] of workflow.errors.entries()) {
      events.push({
        id: `wf-error-${idx}`,
        title: 'Workflow Error',
        description: err,
        timestamp: workflow.updatedAt,
        icon: XCircle,
      });
    }
  }

  return events;
}
