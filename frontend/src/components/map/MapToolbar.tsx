'use client';

import { Layers, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface MapToolbarProps {
  showRoutes: boolean;
  onToggleRoutes: () => void;
}

/**
 * MapToolbar — Map controls and filters
 */
export function MapToolbar({ showRoutes, onToggleRoutes }: MapToolbarProps) {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['hubs'] });
    queryClient.invalidateQueries({ queryKey: ['shipments'] });
    queryClient.invalidateQueries({ queryKey: ['risk'] });
  };

  return (
    <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-lg">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleRoutes}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            showRoutes
              ? 'bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Routes
        </button>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
    </div>
  );
}
