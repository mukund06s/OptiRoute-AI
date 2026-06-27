import type { AlertItem } from '@/lib/api';
import { titleCase } from '@/lib/utils';

/** Read severity from backend alert fields only */
export function readAlertSeverity(alert: AlertItem): string {
  if (alert.anomalyDetails?.severity) return String(alert.anomalyDetails.severity);
  if (alert.isAnomalyAlert) return 'anomaly';
  return 'low';
}

/** Read risk level from backend alert / route-change fields only */
export function readAlertRiskLevel(alert: AlertItem): string | null {
  return alert.routeChange?.riskLevelTriggered ?? alert.anomalyDetails?.riskLevel ?? null;
}

/** Read source agent from backend anomaly details only */
export function readAlertSourceAgent(alert: AlertItem): string | null {
  return alert.anomalyDetails?.agentName ? String(alert.anomalyDetails.agentName) : null;
}

/** Read hub label from backend relations / anomaly details only */
export function readAlertHubLabel(alert: AlertItem): string {
  return (
    alert.routeChange?.triggeredByHub?.city ??
    (alert.anomalyDetails?.hubName ? String(alert.anomalyDetails.hubName) : null) ??
    '—'
  );
}

/** Read shipment tracking ID from backend relations only */
export function readAlertTrackingId(alert: AlertItem): string {
  return (
    alert.shipment?.trackingId ??
    alert.shipment?.tracking_id ??
    (alert.shipmentId != null ? `#${alert.shipmentId}` : '—')
  );
}

/** Map backend delivery status to acknowledged label */
export function readAcknowledgedLabel(status: string): string {
  switch (status?.toLowerCase()) {
    case 'sent':
      return 'Acknowledged';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    default:
      return titleCase(status);
  }
}

/** Resolve hub ID from backend fields for supplementary fetches */
export function readAlertHubId(alert: AlertItem): number | null {
  return (
    alert.routeChange?.triggeredByHubId ??
    alert.anomalyDetails?.hubId ??
    alert.shipment?.currentHubId ??
    null
  );
}
