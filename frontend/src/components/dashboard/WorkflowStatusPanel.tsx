'use client';

import { useQuery } from '@tanstack/react-query';
import { workflowApi, type WorkflowStatus } from '@/lib/api';
import { cn } from '@/lib/utils';
import { GitBranch, CheckCircle2, XCircle, SkipForward } from 'lucide-react';

export function WorkflowStatusPanel() {
  const { data, isLoading, isError } = useQuery({
    queryKey:  ['workflow', 'history', {}],
    queryFn:   () => workflowApi.history(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const workflows = data?.workflows ?? [];

  return (
    <PanelShell
      title="Workflow Executions"
      subtitle="Recent pipeline runs"
      icon={<GitBranch size={14} className="text-blue-400" />}
    >
      {isLoading && <SkeletonRows rows={4} />}

      {isError && (
        <EmptyState message="Could not load workflow history" icon={<XCircle size={20} className="text-red-400" />} />
      )}

      {!isLoading && !isError && workflows.length === 0 && (
        <EmptyState message="No workflow executions yet" icon={<GitBranch size={20} className="text-slate-600" />} />
      )}

      {!isLoading && !isError && workflows.map((wf) => (
        <WorkflowRow key={wf.workflowId} workflow={wf} />
      ))}
    </PanelShell>
  );
}

function WorkflowRow({ workflow }: { workflow: WorkflowStatus }) {
  const statePill: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    partial:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    failed:    'bg-red-500/20 text-red-400 border-red-500/30',
    cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const pill = statePill[workflow.state] ?? statePill.cancelled;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 transition-colors">
      <GitBranch size={13} className="text-slate-500 shrink-0" />

      <span className="text-xs text-slate-400 font-data truncate flex-1">
        {workflow.workflowId.slice(0, 8)}…
      </span>

      {/* Step counts */}
      <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-600">
        <span className="flex items-center gap-1">
          <CheckCircle2 size={10} className="text-green-500" />
          {workflow.completedSteps}
        </span>
        <span className="flex items-center gap-1">
          <SkipForward size={10} className="text-slate-500" />
          {workflow.skippedSteps}
        </span>
        {workflow.failedSteps > 0 && (
          <span className="flex items-center gap-1">
            <XCircle size={10} className="text-red-400" />
            {workflow.failedSteps}
          </span>
        )}
      </div>

      <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', pill)}>
        {workflow.state}
      </span>
    </div>
  );
}

/* ---------- shared helpers ---------- */

function PanelShell({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-[#1E293B] border border-slate-700/60 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-700/60">
        {icon}
        <div>
          <p className="text-sm font-semibold text-slate-200">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  );
}

function SkeletonRows({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-9 rounded-lg bg-slate-700/40 animate-pulse" />
      ))}
    </>
  );
}

function EmptyState({ message, icon }: { message: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      {icon}
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
