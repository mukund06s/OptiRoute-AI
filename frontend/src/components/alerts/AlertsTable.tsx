'use client';

import { Eye } from 'lucide-react';
import type { AlertItem } from '@/lib/api';
import {
  alertStatusBadgeClass,
  cn,
  formatDateTime,
  riskBadgeClass,
  titleCase,
  truncate,
} from '@/lib/utils';
import { AlertSeverityBadge } from './AlertSeverityBadge';
import {
  readAcknowledgedLabel,
  readAlertHubLabel,
  readAlertRiskLevel,
  readAlertSeverity,
  readAlertSourceAgent,
  readAlertTrackingId,
} from './alertFields';

interface AlertsTableProps {
  alerts: AlertItem[];
  loading?: boolean;
  onView: (alert: AlertItem) => void;
}

export function AlertsTable({ alerts, loading, onView }: AlertsTableProps) {
  if (loading) {
    return <AlertsTableSkeleton />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800/80 border-b border-slate-700/60">
            {[
              'Alert ID',
              'Shipment',
              'Hub',
              'Severity',
              'Risk Level',
              'Created Time',
              'Acknowledged',
              'Source Agent',
              'Actions',
            ].map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/40">
          {alerts.map((alert) => {
            const severity = readAlertSeverity(alert);
            const riskLevel = readAlertRiskLevel(alert);
            const sourceAgent = readAlertSourceAgent(alert);

            return (
              <tr
                key={alert.id}
                className="bg-[#1E293B]/40 hover:bg-slate-800/60 transition-colors cursor-pointer"
                onClick={() => onView(alert)}
              >
                <td className="px-4 py-3 font-data text-slate-200 whitespace-nowrap">
                  #{alert.id}
                </td>
                <td className="px-4 py-3 font-data text-slate-300 whitespace-nowrap">
                  {readAlertTrackingId(alert)}
                </td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                  {readAlertHubLabel(alert)}
                </td>
                <td className="px-4 py-3">
                  <AlertSeverityBadge severity={severity} />
                </td>
                <td className="px-4 py-3">
                  {riskLevel ? (
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase',
                        riskBadgeClass(riskLevel),
                      )}
                    >
                      {titleCase(riskLevel)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                  {formatDateTime(alert.sentAt)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase',
                      alertStatusBadgeClass(alert.status),
                    )}
                  >
                    {readAcknowledgedLabel(alert.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                  {sourceAgent ? titleCase(sourceAgent) : '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(alert);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-blue-400 hover:bg-blue-500/10 border border-blue-500/20 transition-colors"
                  >
                    <Eye size={12} />
                    View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AlertsTableSkeleton() {
  return (
    <div className="rounded-xl border border-slate-700/60 overflow-hidden">
      <div className="h-10 bg-slate-800/80 border-b border-slate-700/60" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 border-b border-slate-700/40 bg-slate-800/30 animate-pulse" />
      ))}
    </div>
  );
}

export function alertMessagePreview(message: string, maxLen = 60): string {
  return truncate(message, maxLen);
}
