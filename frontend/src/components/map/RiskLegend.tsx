'use client';

import { riskMarkerColor } from '@/lib/utils';

/**
 * RiskLegend — Color-coded legend for risk levels
 */
export function RiskLegend() {
  const levels = [
    { label: 'Low Risk', level: 'low' },
    { label: 'Medium Risk', level: 'medium' },
    { label: 'High Risk', level: 'high' },
    { label: 'Critical', level: 'critical' },
  ];

  return (
    <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-4 shadow-lg">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">Risk Levels</h3>
      <div className="space-y-2">
        {levels.map(({ label, level }) => (
          <div key={level} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border-2 border-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: riskMarkerColor(level) }}
            />
            <span className="text-xs text-slate-300">{label}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Routes</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-slate-500 opacity-50 flex-shrink-0" style={{ borderTop: '2px dashed' }} />
            <span className="text-xs text-slate-300">Planned Route</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-blue-500 flex-shrink-0" />
            <span className="text-xs text-slate-300">Active Route</span>
          </div>
        </div>
      </div>
    </div>
  );
}
