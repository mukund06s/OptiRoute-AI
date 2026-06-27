'use client';

import { Filter } from 'lucide-react';

export interface AlertFilterValues {
  severity: string;
  risk: string;
  acknowledged: string;
  agent: string;
}

interface AlertFiltersProps {
  values: AlertFilterValues;
  onChange: (values: AlertFilterValues) => void;
}

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
  { value: 'anomaly', label: 'Anomaly' },
];

const RISK_OPTIONS = [
  { value: '', label: 'All Risk Levels' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const ACK_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'sent', label: 'Acknowledged (Sent)' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
];

const AGENT_OPTIONS = [
  { value: '', label: 'All Agents' },
  { value: 'communication', label: 'Communication' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'routing', label: 'Routing' },
  { value: 'risk', label: 'Risk' },
  { value: 'weather', label: 'Weather' },
];

export function AlertFilters({ values, onChange }: AlertFiltersProps) {
  const update = (key: keyof AlertFilterValues, value: string) => {
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
        value={values.severity}
        onChange={(e) => update('severity', e.target.value)}
        className={selectClass}
        aria-label="Filter by severity"
      >
        {SEVERITY_OPTIONS.map((opt) => (
          <option key={opt.value || 'all-severity'} value={opt.value}>
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

      <select
        value={values.acknowledged}
        onChange={(e) => update('acknowledged', e.target.value)}
        className={selectClass}
        aria-label="Filter by acknowledged status"
      >
        {ACK_OPTIONS.map((opt) => (
          <option key={opt.value || 'all-ack'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={values.agent}
        onChange={(e) => update('agent', e.target.value)}
        className={selectClass}
        aria-label="Filter by source agent"
      >
        {AGENT_OPTIONS.map((opt) => (
          <option key={opt.value || 'all-agent'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
