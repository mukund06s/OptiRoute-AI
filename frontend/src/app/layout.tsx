import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OptiRoute',
  description: 'Predict. Reroute. Deliver.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
