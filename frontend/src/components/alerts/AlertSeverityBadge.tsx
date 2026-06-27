'use client';

import { cn, severityBadgeClass, titleCase } from '@/lib/utils';

interface AlertSeverityBadgeProps {
  severity: string;
  className?: string;
}

export function AlertSeverityBadge({ severity, className }: AlertSeverityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
        severityBadgeClass(severity),
        className,
      )}
    >
      {titleCase(severity)}
    </span>
  );
}
