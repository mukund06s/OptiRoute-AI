'use client';

import { Filter } from 'lucide-react';

export interface ShipmentFilterValues {
  status: string;
  priority: string;
  risk: string;
}

interface ShipmentFiltersProps {
  values: ShipmentFilterValues;
  onChange: (values: ShipmentFilterValues) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'rerouted', label: 'Rerouted' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'delivered', label: 'Delivered' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'standard', label: 'Standard' },
  { value: 'express', label: 'Express' },
  { value: 'critical', label: 'Critical' },
];

const RISK_OPTIONS = [
  { value: '', label: 'All Risk Levels' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function ShipmentFilters({ values, onChange }: ShipmentFiltersProps) {
  const update = (key: keyof ShipmentFilterValues, value: string) => {
    onChange({ ...values, [key]: value });
  };

  const selectClass =
    'px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1">
        <Filter size={13} />
        <span>Filters</span>
      </div>

      <select
        value={values.status}
        onChange={(e) => update('status', e.target.value)}
        className={selectClass}
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value || 'all-status'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={values.priority}
        onChange={(e) => update('priority', e.target.value)}
        className={selectClass}
        aria-label="Filter by priority"
      >
        {PRIORITY_OPTIONS.map((opt) => (
          <option key={opt.value || 'all-priority'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={values.risk}
        onChange={(e) => update('risk', e.target.value)}
        className={selectClass}
        aria-label="Filter by risk"
      >
        {RISK_OPTIONS.map((opt) => (
          <option key={opt.value || 'all-risk'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
