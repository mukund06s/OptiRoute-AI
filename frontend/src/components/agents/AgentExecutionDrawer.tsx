'use client';

import { useQuery } from '@tanstack/react-query';
import { X, Bot, Loader2, AlertTriangle, GitBranch } from 'lucide-react';
import type { AgentCycleSummary } from '@/lib/api';
import { agentsApi, workflowApi } from '@/lib/api';
import { agentStatusBadgeClass, cn, formatDateTime, titleCase } from '@/lib/utils';
import { AgentTimeline } from './AgentTimeline';
import { AgentLogViewer } from './AgentLogViewer';
import { formatDurationMs } from './agentFields';

interface AgentExecutionDrawerProps {
  cycle: AgentCycleSummary | null;
  open: boolean;
  onClose: () => void;
}

export function AgentExecutionDrawer({ cycle, open, onClose }: AgentExecutionDrawerProps) {
  const { data: cycleLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['agents', 'logs', cycle?.cycleId],
    queryFn: () => agentsApi.logsByCycle(cycle!.cycleId),
    enabled: open && cycle !== null,
    staleTime: 30_000,
    retry: false,
  });

  const { data: workflow, isLoading: workflowLoading } = useQuery({
    queryKey: ['workflow', 'status', cycle?.workflowId],
    queryFn: () => workflowApi.status(cycle!.workflowId!),
    enabled: open && cycle?.workflowId != null,
    staleTime: 30_000,
    retry: false,
  });

  if (!open || !cycle) return null;

  const logs = cycleLogs?.logs ?? [];
  const isLoading = logsLoading || (cycle.workflowId ? workflowLoading : false);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-2xl bg-[#1E293B] border-l border-slate-700/60 shadow-2xl flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-700/60 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bot size={16} className="text-blue-400" />
              <h2 className="text-base font-semibold text-slate-100 font-data">
                Cycle {cycle.cycleId.slice(0, 16)}…
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase',
                  agentStatusBadgeClass(cycle.status),
                )}
              >
                {titleCase(cycle.status)}
              </span>
              <span className="text-[11px] text-slate-500">
                {formatDateTime(cycle.executionTime)}
              </span>
              <span className="text-[11px] text-slate-500 font-data">
                {formatDurationMs(cycle.durationMs)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading && (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
              <Loader2 size={20} className="animate-spin text-blue-400" />
              <span className="text-sm">Loading execution details…</span>
            </div>
          )}

          {/* Execution plan */}
          <section>
            <SectionTitle icon={GitBranch}>Execution Plan</SectionTitle>
            <div className="mt-3 rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
              {workflow?.steps?.length ? (
                <div className="space-y-2">
                  {workflow.steps.map((step, index) => (
                    <div
                      key={`${step.agent}-${index}`}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-slate-300 capitalize">
                        {index + 1}. {step.agent}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase',
                          agentStatusBadgeClass(step.state),
                        )}
                      >
                        {titleCase(step.state)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No execution plan data from backend</p>
              )}
            </div>
          </section>

          {/* Warnings & Errors */}
          {(cycle.warnings.length > 0 || cycle.errors.length > 0 || workflow?.errors?.length) && (
            <section>
              <SectionTitle icon={AlertTriangle}>Warnings & Errors</SectionTitle>
              <div className="mt-3 space-y-2">
                {cycle.warnings.map((warning, idx) => (
                  <Notice key={`w-${idx}`} text={warning} type="warning" />
                ))}
                {cycle.errors.map((err, idx) => (
                  <Notice key={`e-${idx}`} text={err} type="error" />
                ))}
                {workflow?.errors?.map((err, idx) => (
                  <Notice key={`we-${idx}`} text={err} type="error" />
                ))}
              </div>
            </section>
          )}

          {/* Timeline */}
          <section>
            <SectionTitle>Timeline</SectionTitle>
            <div className="mt-3">
              <AgentTimeline logs={logs} workflow={workflow ?? null} loading={isLoading} />
            </div>
          </section>

          {/* Agent logs */}
          <section>
            <SectionTitle>Agent Logs</SectionTitle>
            <div className="mt-3">
              <AgentLogViewer logs={logs} loading={logsLoading} />
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}

function SectionTitle({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: typeof GitBranch;
}) {
  return (
    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
      {Icon && <Icon size={12} />}
      {children}
    </h3>
  );
}

function Notice({ text, type }: { text: string; type: 'warning' | 'error' }) {
  return (
    <p
      className={cn(
        'text-xs rounded px-3 py-2 border',
        type === 'error'
          ? 'text-red-400 bg-red-500/10 border-red-500/20'
          : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      )}
    >
      {text}
    </p>
  );
}
