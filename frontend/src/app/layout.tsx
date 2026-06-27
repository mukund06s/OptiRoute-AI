import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { AppLayout } from '@/components/layout';

export const metadata: Metadata = {
  title:       'OptiRoute — Logistics Intelligence',
  description: 'AI-powered proactive logistics routing and risk management',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0F172A] text-slate-100 font-sans antialiased">
        <Providers>
          <AppLayout>
            {children}
          </AppLayout>
        </Providers>
      </body>
    </html>
  );
}
