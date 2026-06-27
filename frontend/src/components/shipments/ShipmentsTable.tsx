'use client';

import { Eye } from 'lucide-react';
import type { ShipmentListItem, RiskScore } from '@/lib/api';
import { formatDateTime, riskBadgeClass, titleCase } from '@/lib/utils';
import { ShipmentStatusBadge } from './ShipmentStatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { cn } from '@/lib/utils';

interface ShipmentsTableProps {
  shipments: ShipmentListItem[];
  riskByHubId: Map<number, RiskScore>;
  loading?: boolean;
  onView: (shipment: ShipmentListItem) => void;
}

export function ShipmentsTable({
  shipments,
  riskByHubId,
  loading,
  onView,
}: ShipmentsTableProps) {
  if (loading) {
    return <ShipmentsTableSkeleton />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800/80 border-b border-slate-700/60">
            {[
              'Tracking ID',
              'Origin',
              'Destination',
              'Current Hub',
              'Status',
              'Priority',
              'Risk',
              'ETA',
              'Current Route',
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
          {shipments.map((shipment) => {
            const hubId = shipment.currentHubId ?? shipment.originHubId;
            const risk = riskByHubId.get(hubId);
            const riskLevel = risk?.riskLevel ?? '—';

            return (
              <tr
                key={shipment.id}
                className="bg-[#1E293B]/40 hover:bg-slate-800/60 transition-colors cursor-pointer"
                onClick={() => onView(shipment)}
              >
                <td className="px-4 py-3 font-data text-slate-200 whitespace-nowrap">
                  {shipment.trackingId}
                </td>
                <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                  {shipment.originHub.city}
                </td>
                <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                  {shipment.destinationHub.city}
                </td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                  {shipment.currentHub?.city ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <ShipmentStatusBadge status={shipment.status} />
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={shipment.priority} />
                </td>
                <td className="px-4 py-3">
                  {risk ? (
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase',
                        riskBadgeClass(risk.riskLevel),
                      )}
                    >
                      {titleCase(risk.riskLevel)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">{riskLevel}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                  {shipment.eta ? formatDateTime(shipment.eta) : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 max-w-[180px] truncate">
                  {formatRouteNames(shipment.activeRouteNames)}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(shipment);
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

function ShipmentsTableSkeleton() {
  return (
    <div className="rounded-xl border border-slate-700/60 overflow-hidden">
      <div className="h-10 bg-slate-800/80 border-b border-slate-700/60" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 border-b border-slate-700/40 bg-slate-800/30 animate-pulse" />
      ))}
    </div>
  );
}

function formatRouteNames(names: string[] | null): string {
  if (!names?.length) return '—';
  return names.join(' → ');
}
