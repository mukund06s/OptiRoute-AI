'use client';

import { X, MapPin, CloudRain, Wind, Droplets, Eye, AlertTriangle } from 'lucide-react';
import type { Hub } from '@/lib/api';
import { riskBadgeClass, titleCase, formatDateTime } from '@/lib/utils';
import { SHAPExplanationWidget } from './SHAPExplanationWidget';
import { hubsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

interface HubDetailPanelProps {
  hub: Hub;
  onClose: () => void;
}

/**
 * HubDetailPanel — Displays detailed hub information
 * Shows risk score, weather data, SHAP explanation, and connected routes
 */
export function HubDetailPanel({ hub, onClose }: HubDetailPanelProps) {
  // Fetch full hub details including connected routes and shipment count
  const { data: hubDetail, isLoading } = useQuery({
    queryKey: ['hub-detail', hub.id],
    queryFn: () => hubsApi.getById(hub.id),
    staleTime: 30_000,
  });

  const riskScore = hub.riskScore;
  const weather = hub.weatherEvent;
  const riskLevel = riskScore?.riskLevel ?? 'low';
  const delayProbability =
    riskScore?.delayProbability != null
      ? typeof riskScore.delayProbability === 'string'
        ? parseFloat(riskScore.delayProbability)
        : riskScore.delayProbability
      : 0;

  const connectedRoutes =
    (hubDetail?.originRoutes?.length ?? 0) + (hubDetail?.destinationRoutes?.length ?? 0);

  return (
    <div className="absolute top-4 right-4 z-[1000] w-96 max-h-[calc(100vh-2rem)] overflow-y-auto bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-start justify-between">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-100">{hub.name}</h2>
          </div>
          <p className="text-xs text-slate-400">{hub.city}, {hub.state}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Risk Score */}
        {riskScore ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Risk Assessment</span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${riskBadgeClass(riskLevel)}`}>
                {riskLevel}
              </span>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Delay Probability</span>
                <span className="text-sm font-bold text-slate-100">
                  {(delayProbability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Computed {riskScore.computedAt ? formatDateTime(riskScore.computedAt) : '—'}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">No risk data available</span>
            </div>
          </div>
        )}

        {/* Weather Data */}
        {weather ? (
          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">
              Current Weather
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-slate-400">Condition</span>
                </div>
                <span className="text-sm font-semibold text-slate-100">{weather.condition}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <Droplets className="w-3.5 h-3.5 text-slate-500" />
                  <div>
                    <div className="text-xs text-slate-500">Rain</div>
                    <div className="text-xs font-semibold text-slate-200">{weather.precipitationMm}mm</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="w-3.5 h-3.5 text-slate-500" />
                  <div>
                    <div className="text-xs text-slate-500">Wind</div>
                    <div className="text-xs font-semibold text-slate-200">{weather.windSpeedKmh} km/h</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="w-3.5 h-3.5 text-slate-500" />
                  <div>
                    <div className="text-xs text-slate-500">Humidity</div>
                    <div className="text-xs font-semibold text-slate-200">{weather.humidity}%</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <div>
                    <div className="text-xs text-slate-500">Visibility</div>
                    <div className="text-xs font-semibold text-slate-200">{weather.visibilityKm} km</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400">
              <CloudRain className="w-4 h-4" />
              <span className="text-xs">No weather data available</span>
            </div>
          </div>
        )}

        {/* Hub Stats */}
        {!isLoading && hubDetail && (
          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">
              Hub Statistics
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-1">Connected Routes</div>
                <div className="text-lg font-bold text-slate-100">{connectedRoutes}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-1">Active Shipments</div>
                <div className="text-lg font-bold text-slate-100">—</div>
              </div>
            </div>
          </div>
        )}

        {/* SHAP Explanation */}
        {riskScore && riskScore.shapValues && (
          <div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <SHAPExplanationWidget riskScore={riskScore} />
            </div>
          </div>
        )}

        {/* Manager Info */}
        <div>
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">
            Hub Manager
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 space-y-1">
            <div className="text-sm font-semibold text-slate-100">{hub.managerName ?? '—'}</div>
            <div className="text-xs text-slate-400">{hub.managerEmail ?? '—'}</div>
            <div className="text-xs text-slate-500 mt-2">
              Type: {titleCase(hub.hubType)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
