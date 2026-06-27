'use client';

import { Search } from 'lucide-react';

interface ShipmentSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ShipmentSearch({ value, onChange }: ShipmentSearchProps) {
  return (
    <div className="relative flex-1 min-w-[220px] max-w-md">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search tracking ID, origin, destination…"
        className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
      />
    </div>
  );
}
