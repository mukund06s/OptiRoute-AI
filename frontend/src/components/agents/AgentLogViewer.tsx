'use client';

import type { AgentLogItem } from '@/lib/api';
import { agentStatusBadgeClass, cn, formatDateTime, titleCase } from '@/lib/utils';
import { formatDurationMs } from './agentFields';

interface AgentLogViewerProps {
  logs: AgentLogItem[];
  loading?: boolean;
}

export function AgentLogViewer({ logs, loading }: AgentLogViewerProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-slate-700/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <p className="text-xs text-slate-500 py-6 text-center">
        No agent logs available for this cycle
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div
          key={log.id}
          className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3 space-y-2"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200 capitalize">
                {log.agentName}
              </span>
              <span className="text-[11px] text-slate-500">{log.action}</span>
            </div>
            <div className="flex items-center gap-2">
              {log.status && (
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase',
                    agentStatusBadgeClass(log.status),
                  )}
                >
                  {titleCase(log.status)}
                </span>
              )}
              <span className="text-[11px] text-slate-500 font-data">
                {formatDurationMs(log.durationMs)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">{formatDateTime(log.createdAt)}</p>

          {log.inputData && (
            <LogBlock label="Input" data={log.inputData} />
          )}
          {log.outputData && (
            <LogBlock label="Output" data={log.outputData} />
          )}
          {log.errorMessage && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
              {log.errorMessage}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function LogBlock({ label, data }: { label: string; data: Record<string, unknown> }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <pre className="text-[10px] text-slate-400 bg-slate-900/50 rounded p-2 overflow-x-auto font-mono leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
