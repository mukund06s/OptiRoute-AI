/**
 * Utility functions - no business logic
 */

/** Merge class names (simple implementation, no external dep needed) */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Risk level → display colour class */
export function riskColor(level: string): string {
  switch (level?.toLowerCase()) {
    case 'critical': return 'text-red-400';
    case 'high':     return 'text-orange-400';
    case 'medium':   return 'text-yellow-400';
    default:         return 'text-green-400';
  }
}

/** Risk level → background badge class */
export function riskBadgeClass(level: string): string {
  switch (level?.toLowerCase()) {
    case 'critical': return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case 'high':     return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    case 'medium':   return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    default:         return 'bg-green-500/20 text-green-400 border border-green-500/30';
  }
}

/** Shipment status → display badge class */
export function statusBadgeClass(status: string): string {
  switch (status?.toLowerCase()) {
    case 'at_risk':    return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case 'delayed':    return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    case 'in_transit': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    case 'delivered':  return 'bg-green-500/20 text-green-400 border border-green-500/30';
    default:           return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
  }
}

/** Format a date string to a human-readable relative time */
export function timeAgo(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return new Date(date).toLocaleDateString();
}

/** Format ISO date to HH:MM */
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Format ISO date to DD MMM, HH:MM */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Capitalise first letter of each word */
export function titleCase(str: string): string {
  return str
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

/** Truncate a string to maxLen characters */
export function truncate(str: string, maxLen = 30): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}
