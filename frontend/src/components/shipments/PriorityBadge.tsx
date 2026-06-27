'use client';

import { cn, priorityBadgeClass, titleCase } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
        priorityBadgeClass(priority),
        className,
      )}
    >
      {titleCase(priority)}
    </span>
  );
}
