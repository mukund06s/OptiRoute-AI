'use client';

import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ErrorBoundary } from './ErrorBoundary';
import { useQuery } from '@tanstack/react-query';
import { agentsApi } from '@/lib/api';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Lightweight poll for agent online status displayed in sidebar
  const { data: agentStatus } = useQuery({
    queryKey: ['agents', 'status'],
    queryFn:  () => agentsApi.status(),
    staleTime: 30_000,
    retry: false,
  });

  return (
    <div className="flex min-h-screen bg-[#0F172A]">
      {/* Sidebar */}
      <Sidebar agentOnline={agentStatus?.isRunning === true} />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
