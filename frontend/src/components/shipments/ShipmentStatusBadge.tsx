'use client';

import { cn, statusBadgeClass, titleCase } from '@/lib/utils';

interface ShipmentStatusBadgeProps {
  status: string;
  className?: string;
}

export function ShipmentStatusBadge({ status, className }: ShipmentStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
        statusBadgeClass(status),
        className,
      )}
    >
      {titleCase(status)}
    </span>
  );
}
