'use client';

import { useQuery } from '@tanstack/react-query';
import {
  X,
  Bell,
  Package,
  MapPin,
  CloudRain,
  AlertTriangle,
} from 'lucide-react';
import type { AlertItem, RiskScore } from '@/lib/api';
import { hubsApi, riskApi, shipmentsApi } from '@/lib/api';
import {
  alertStatusBadgeClass,
  cn,
  formatDateTime,
  riskBadgeClass,
  titleCase,
} from '@/lib/utils';
import { AlertSeverityBadge } from './AlertSeverityBadge';
import { AlertTimeline } from './AlertTimeline';
import { SHAPExplanationWidget } from '@/components/map/SHAPExplanationWidget';
import {
  readAcknowledgedLabel,
  readAlertHubId,
  readAlertHubLabel,
  readAlertRiskLevel,
  readAlertSeverity,
  readAlertSourceAgent,
  readAlertTrackingId,
} from './alertFields';

interface AlertDrawerProps {
  alert: AlertItem | null;
  open: boolean;
  onClose: () => void;
}

export function AlertDrawer({ alert, open, onClose }: AlertDrawerProps) {
  const shipmentId = alert?.shipmentId ?? null;
  const hubId = alert ? readAlertHubId(alert) : null;

  const { data: shipment, isLoading: shipmentLoading } = useQuery({
    queryKey: ['shipment', shipmentId],
    queryFn: () => shipmentsApi.getById(shipmentId!),
    enabled: open && shipmentId !== null,
    staleTime: 30_000,
  });

  const { data: hub, isLoading: hubLoading } = useQuery({
    queryKey: ['hub-detail', hubId],
    queryFn: () => hubsApi.getById(hubId!),
    enabled: open && hubId !== null,
    staleTime: 30_000,
    retry: false,
  });

  const { data: riskScore, isLoading: riskLoading } = useQuery({
    queryKey: ['risk', 'hub', hubId],
    queryFn: () => riskApi.scoresByHub(hubId!),
    enabled: open && hubId !== null,
    staleTime: 30_000,
    retry: false,
  });

  if (!open || !alert) return null;

  const severity = readAlertSeverity(alert);
  const riskLevel = readAlertRiskLevel(alert);
  const sourceAgent = readAlertSourceAgent(alert);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-[#1E293B] border-l border-slate-700/60 shadow-2xl flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-700/60 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bell size={16} className="text-yellow-400" />
              <h2 className="text-base font-semibold text-slate-100 font-data">
                Alert #{alert.id}
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <AlertSeverityBadge severity={severity} />
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase',
                  alertStatusBadgeClass(alert.status),
                )}
              >
                {readAcknowledgedLabel(alert.status)}
              </span>
              {alert.isAnomalyAlert && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Anomaly
                </span>
              )}
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
          {/* Alert details */}
          <section>
            <SectionTitle>Alert Details</SectionTitle>
            <div className="mt-3 rounded-lg bg-slate-800/50 border border-slate-700/50 p-3 space-y-3">
              <DetailRow label="Channel" value={titleCase(alert.channel)} />
              <DetailRow label="Recipient" value={alert.recipient ?? '—'} />
              <DetailRow label="Source Agent" value={sourceAgent ? titleCase(sourceAgent) : '—'} />
              <DetailRow label="Sent At" value={formatDateTime(alert.sentAt)} />
              {alert.subject && <DetailRow label="Subject" value={alert.subject} />}
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Message</p>
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {alert.message}
                </p>
              </div>
            </div>
          </section>

          {/* Shipment details */}
          <section>
            <SectionTitle>Shipment Details</SectionTitle>
            <div className="mt-3 rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
              {shipmentLoading ? (
                <div className="h-16 rounded bg-slate-700/40 animate-pulse" />
              ) : shipment ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-200 font-data">
                    <Package size={14} className="text-blue-400" />
                    {shipment.trackingId}
                  </div>
                  <DetailRow
                    label="Route"
                    value={`${shipment.originHub.city} → ${shipment.destinationHub.city}`}
                  />
                  <DetailRow label="Status" value={titleCase(shipment.status)} />
                  <DetailRow label="Priority" value={titleCase(shipment.priority)} />
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Shipment: {readAlertTrackingId(alert)}
                </p>
              )}
            </div>
          </section>

          {/* Hub details */}
          <section>
            <SectionTitle>Hub Details</SectionTitle>
            <div className="mt-3 rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
              {hubLoading ? (
                <div className="h-16 rounded bg-slate-700/40 animate-pulse" />
              ) : hub ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <MapPin size={14} className="text-blue-400" />
                    {hub.name}
                  </div>
                  <DetailRow label="City" value={`${hub.city}, ${hub.state ?? ''}`} />
                  <DetailRow label="Type" value={titleCase(hub.hubType)} />
                  <DetailRow label="Manager" value={hub.managerName ?? '—'} />
                </div>
              ) : (
                <p className="text-xs text-slate-500">Hub: {readAlertHubLabel(alert)}</p>
              )}
            </div>
          </section>

          {/* Weather snapshot */}
          <section>
            <SectionTitle>Weather Snapshot</SectionTitle>
            <div className="mt-3 rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <CloudRain size={14} />
                <p className="text-xs">No weather snapshot available from backend</p>
              </div>
            </div>
          </section>

          {/* Risk explanation */}
          <section>
            <SectionTitle>Risk Explanation</SectionTitle>
            <div className="mt-3 rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
              {riskLoading ? (
                <div className="h-12 rounded bg-slate-700/40 animate-pulse" />
              ) : riskScore ? (
                <RiskSection riskScore={normalizeRiskScore(riskScore)} />
              ) : riskLevel ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-orange-400" />
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase',
                      riskBadgeClass(riskLevel),
                    )}
                  >
                    {titleCase(riskLevel)}
                  </span>
                  <span className="text-xs text-slate-400">from route change record</span>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No risk data available</p>
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

          {/* Timeline */}
          <section>
            <SectionTitle>Timeline</SectionTitle>
            <div className="mt-3">
              <AlertTimeline alert={alert} />
            </div>
          </section>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-200 text-right">{value}</span>
    </div>
  );
}

function RiskSection({ riskScore }: { riskScore: RiskScore }) {
  const probability =
    typeof riskScore.delayProbability === 'string'
      ? parseFloat(riskScore.delayProbability)
      : Number(riskScore.delayProbability);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">Delay Probability</span>
        <span
          className={cn(
            'text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase',
            riskBadgeClass(riskScore.riskLevel),
          )}
        >
          {titleCase(riskScore.riskLevel)}
        </span>
      </div>
      <p className="text-xl font-bold text-slate-100 font-data">
        {(probability * 100).toFixed(1)}%
      </p>
      {riskScore.humanExplanation && (
        <p className="text-xs text-slate-400 leading-relaxed">{riskScore.humanExplanation}</p>
      )}
    </div>
  );
}

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
        : Number(score.delayProbability),
    hub_id: score.hubId,
    computed_at: score.computedAt,
  };
}
