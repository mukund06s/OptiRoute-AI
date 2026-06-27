'use client';

import { useQuery } from '@tanstack/react-query';
import {
  X,
  Package,
  CloudRain,
  Bell,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { shipmentsApi, riskApi } from '@/lib/api';
import { formatDateTime, riskBadgeClass, titleCase } from '@/lib/utils';
import { ShipmentStatusBadge } from './ShipmentStatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { RouteChangeTimeline } from './RouteChangeTimeline';
import { SHAPExplanationWidget } from '@/components/map/SHAPExplanationWidget';
import type { RiskScore } from '@/lib/api';

interface ShipmentDrawerProps {
  shipmentId: number | null;
  open: boolean;
  onClose: () => void;
}

export function ShipmentDrawer({ shipmentId, open, onClose }: ShipmentDrawerProps) {
  const {
    data: shipment,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['shipment', shipmentId],
    queryFn: () => shipmentsApi.getById(shipmentId!),
    enabled: open && shipmentId !== null,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const currentHubId = shipment?.currentHubId ?? shipment?.originHubId ?? null;

  const { data: riskScore, isLoading: riskLoading } = useQuery({
    queryKey: ['risk', 'hub', currentHubId],
    queryFn: () => riskApi.scoresByHub(currentHubId!),
    enabled: open && currentHubId !== null,
    staleTime: 30_000,
    retry: false,
  });

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-[#1E293B] border-l border-slate-700/60 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-700/60 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Package size={16} className="text-blue-400" />
              <h2 className="text-base font-semibold text-slate-100 font-data">
                {isLoading ? 'Loading…' : shipment?.trackingId ?? 'Shipment'}
              </h2>
            </div>
            {shipment && (
              <div className="flex items-center gap-2 mt-2">
                <ShipmentStatusBadge status={shipment.status} />
                <PriorityBadge priority={shipment.priority} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={28} className="animate-spin text-blue-400" />
              <p className="text-sm text-slate-500">Loading shipment details…</p>
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle size={28} className="text-red-400" />
              <p className="text-sm text-slate-400">Failed to load shipment details</p>
            </div>
          )}

          {shipment && (
            <>
              {/* Shipment details */}
              <section>
                <SectionTitle>Shipment Details</SectionTitle>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <DetailItem label="Origin" value={shipment.originHub.city} />
                  <DetailItem label="Destination" value={shipment.destinationHub.city} />
                  <DetailItem label="Current Hub" value={shipment.currentHub?.city ?? '—'} />
                  <DetailItem
                    label="Weight"
                    value={shipment.weightKg ? `${shipment.weightKg} kg` : '—'}
                  />
                  <DetailItem
                    label="ETA"
                    value={shipment.eta ? formatDateTime(shipment.eta) : '—'}
                  />
                  <DetailItem
                    label="Created"
                    value={formatDateTime(shipment.createdAt)}
                  />
                </div>
              </section>

              {/* Routes */}
              <section>
                <SectionTitle>Routes</SectionTitle>
                <div className="mt-3 space-y-2">
                  <RouteRow label="Planned" names={shipment.plannedRouteNames} muted />
                  <RouteRow label="Active" names={shipment.activeRouteNames} highlight />
                </div>
              </section>

              {/* Current risk */}
              <section>
                <SectionTitle>Current Risk</SectionTitle>
                <div className="mt-3 rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
                  {riskLoading ? (
                    <div className="h-12 rounded bg-slate-700/40 animate-pulse" />
                  ) : riskScore ? (
                    <RiskSection riskScore={normalizeRiskScore(riskScore)} />
                  ) : (
                    <p className="text-xs text-slate-500">No risk data available for current hub</p>
                  )}
                </div>
              </section>

              {/* SHAP */}
              {riskScore?.shapValues && (
                <section>
                  <SectionTitle>SHAP Explanation</SectionTitle>
                  <div className="mt-3 rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
                    <SHAPExplanationWidget riskScore={normalizeRiskScore(riskScore)} />
                  </div>
                </section>
              )}

              {/* Weather — rendered when backend provides hub weather data */}
              <section>
                <SectionTitle>Current Weather</SectionTitle>
                <div className="mt-3 rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <CloudRain size={14} />
                    <p className="text-xs">No weather data available for current hub</p>
                  </div>
                </div>
              </section>

              {/* Route change timeline */}
              <section>
                <SectionTitle>Route Change Timeline</SectionTitle>
                <div className="mt-3">
                  <RouteChangeTimeline changes={shipment.routeChanges ?? []} />
                </div>
              </section>

              {/* Alerts */}
              <section>
                <SectionTitle>Alerts Sent</SectionTitle>
                <div className="mt-3 space-y-2">
                  {(shipment.alerts ?? []).length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No alerts sent for this shipment</p>
                  ) : (
                    shipment.alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Bell size={12} />
                            <span className="uppercase">{alert.channel}</span>
                            {alert.recipient && <span>→ {alert.recipient}</span>}
                          </div>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              alert.status === 'sent'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-slate-600/30 text-slate-400'
                            }`}
                          >
                            {titleCase(alert.status)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-3">{alert.message}</p>
                        <p className="text-[11px] text-slate-500">{formatDateTime(alert.sentAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{children}</h3>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 px-3 py-2">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-slate-200">{value}</p>
    </div>
  );
}

function RouteRow({
  label,
  names,
  muted,
  highlight,
}: {
  label: string;
  names: string[] | null;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-800/50 border border-slate-700/50 px-3 py-2">
      <span className="text-[10px] text-slate-500 uppercase tracking-wide w-14 shrink-0 pt-0.5">
        {label}
      </span>
      <span
        className={`text-xs flex-1 ${
          highlight ? 'text-blue-400' : muted ? 'text-slate-400' : 'text-slate-300'
        }`}
      >
        {names?.length ? names.join(' → ') : '—'}
      </span>
    </div>
  );
}

function RiskSection({ riskScore }: { riskScore: RiskScore }) {
  const probability =
    typeof riskScore.delayProbability === 'string'
      ? parseFloat(riskScore.delayProbability)
      : riskScore.delayProbability;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">Delay Probability</span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${riskBadgeClass(riskScore.riskLevel)}`}
        >
          {titleCase(riskScore.riskLevel)}
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-100 font-data">
        {(probability * 100).toFixed(1)}%
      </p>
      {riskScore.humanExplanation && (
        <p className="text-xs text-slate-400 leading-relaxed">{riskScore.humanExplanation}</p>
      )}
    </div>
  );
}

/** Normalize RiskScore for SHAPExplanationWidget which expects snake_case fields */
function normalizeRiskScore(score: RiskScore): RiskScore {
  return {
    ...score,
    shap_values: score.shapValues ?? score.shap_values ?? null,
    top_risk_factors: score.topRiskFactors ?? score.top_risk_factors ?? null,
    human_explanation: score.humanExplanation ?? score.human_explanation ?? null,
    risk_level: score.riskLevel,
    delay_probability:
      typeof score.delayProbability === 'string'
        ? parseFloat(score.delayProbability)
        : score.delayProbability,
    hub_id: score.hubId,
    computed_at: score.computedAt,
  };
}
