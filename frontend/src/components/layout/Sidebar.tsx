'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  Package,
  Bell,
  Bot,
  Activity,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { href: '/map',      label: 'Map',       icon: Map             },
  { href: '/shipments',label: 'Shipments', icon: Package         },
  { href: '/alerts',   label: 'Alerts',    icon: Bell            },
  { href: '/agents',   label: 'Agents',    icon: Bot             },
];

interface SidebarProps {
  agentOnline?: boolean;
}

export function Sidebar({ agentOnline = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-[#1E293B] border-r border-slate-700/60">
      {/* Logo / brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
          <Truck size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-100 leading-tight">OptiRoute</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Logistics AI</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50',
              )}
            >
              <Icon size={16} className={active ? 'text-blue-400' : 'text-slate-500'} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Agent status indicator */}
      <div className="px-4 py-4 border-t border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <Activity size={14} className={agentOnline ? 'text-green-400' : 'text-slate-600'} />
          <div>
            <p className="text-xs text-slate-400 leading-none mb-0.5">Agent System</p>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  agentOnline ? 'bg-green-400 shadow-[0_0_6px_#22c55e]' : 'bg-slate-600',
                )}
              />
              <span className="text-[11px] text-slate-500">
                {agentOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
