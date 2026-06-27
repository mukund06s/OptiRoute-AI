'use client';

import type { RiskScore } from '@/lib/api';

interface SHAPExplanationWidgetProps {
  riskScore: RiskScore;
}

/**
 * SHAPExplanationWidget — Visualizes SHAP feature contributions
 * Shows top risk factors with horizontal bars
 */
export function SHAPExplanationWidget({ riskScore }: SHAPExplanationWidgetProps) {
  const shapValues = riskScore.shapValues ?? riskScore.shap_values ?? {};
  const topFactors = riskScore.topRiskFactors ?? riskScore.top_risk_factors ?? [];
  const humanExplanation = riskScore.humanExplanation ?? riskScore.human_explanation;

  // Sort by absolute SHAP value (descending) and take top 4
  const sortedFeatures = Object.entries(shapValues)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 4);

  if (sortedFeatures.length === 0) {
    return (
      <div className="text-xs text-slate-400 italic">
        No explanation data available
      </div>
    );
  }

  // Find max absolute value for scaling
  const maxAbsValue = Math.max(...sortedFeatures.map(([, val]) => Math.abs(val)));

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
        Contributing Factors
      </div>

      <div className="space-y-2">
        {sortedFeatures.map(([feature, value]) => {
          const percentage = maxAbsValue > 0 ? (Math.abs(value) / maxAbsValue) * 100 : 0;
          const displayFeature = feature.replace(/_/g, ' ');

          return (
            <div key={feature}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-mono">{displayFeature}</span>
                <span className="text-slate-400">{(Math.abs(value) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {humanExplanation && (
        <div className="mt-4 pt-3 border-t border-slate-700">
          <div className="text-xs text-slate-300 leading-relaxed">
            {humanExplanation}
          </div>
        </div>
      )}

      {topFactors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="text-xs font-semibold text-slate-300 mb-2">Top Risk Factors:</div>
          <ul className="space-y-1">
            {topFactors.map((factor, idx) => (
              <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                <span className="text-amber-500 flex-shrink-0">•</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
