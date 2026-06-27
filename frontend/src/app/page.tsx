/**
 * Dashboard page — Phase 9A: Foundation shell only.
 * Widget content (StatCards, RouteChanges, AgentStatus) implemented in Phase 9B.
 */

import { Activity, Package, MapPin, Bell } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Overview</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Real-time logistics monitoring and AI-driven route optimisation
        </p>
      </div>

      {/* Stat cards skeleton row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_PLACEHOLDERS.map(({ label, icon: Icon, color }) => (
          <StatCardShell key={label} label={label} icon={<Icon size={18} className={color} />} />
        ))}
      </div>

      {/* Route changes + Agent status placeholder row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectionShell title="Recent Route Changes" hint="Last 10 reroute events" rows={5} />
        </div>
        <div>
          <SectionShell title="Agent Status" hint="System health" rows={3} />
        </div>
      </div>
    </div>
  );
}

/* ---------- local shell components (no data, no business logic) ---------- */

const STAT_PLACEHOLDERS = [
  { label: 'Active Shipments',  icon: Package,  color: 'text-blue-400'   },
  { label: 'Rerouted Today',    icon: Activity, color: 'text-yellow-400' },
  { label: 'At-Risk Hubs',      icon: MapPin,   color: 'text-orange-400' },
  { label: 'Alerts Sent',       icon: Bell,     color: 'text-red-400'    },
];

function StatCardShell({
  label,
  icon,
}: {
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 p-5 rounded-xl bg-[#1E293B] border border-slate-700/60">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        {icon}
      </div>
      {/* Value placeholder */}
      <div className="h-7 w-16 rounded bg-slate-700/60 animate-pulse" />
    </div>
  );
}

function SectionShell({
  title,
  hint,
  rows,
}: {
  title: string;
  hint: string;
  rows: number;
}) {
  return (
    <div className="rounded-xl bg-[#1E293B] border border-slate-700/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
        <div>
          <p className="text-sm font-semibold text-slate-200">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-8 rounded bg-slate-700/40 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
