'use client';

import { usePathname } from 'next/navigation';
import { RefreshCw, Clock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const PAGE_TITLES: Record<string, string> = {
  '/':          'Dashboard',
  '/map':       'Network Map',
  '/shipments': 'Shipments',
  '/alerts':    'Alerts',
  '/agents':    'Agent Monitor',
};

export function TopBar() {
  const pathname = usePathname();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const title = PAGE_TITLES[pathname] ?? 'OptiRoute';

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <header className="flex items-center justify-between h-14 px-6 bg-[#1E293B] border-b border-slate-700/60 shrink-0">
      {/* Page title */}
      <div>
        <h1 className="text-base font-semibold text-slate-100">{title}</h1>
        <p className="text-[11px] text-slate-500 leading-none mt-0.5">
          OptiRoute Logistics Intelligence
        </p>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        {/* Last updated */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500">
          <Clock size={12} />
          <span>Auto-refresh 30s</span>
        </div>

        {/* Manual refresh */}
        <button
          onClick={handleRefresh}
          aria-label="Refresh data"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 border border-slate-700 hover:border-blue-500/30 transition-all duration-150"
        >
          <RefreshCw
            size={13}
            className={refreshing ? 'animate-spin' : ''}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
}
