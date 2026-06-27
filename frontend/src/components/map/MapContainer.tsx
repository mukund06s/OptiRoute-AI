'use client';

import { MapContainer as LeafletMapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ReactNode, useEffect } from 'react';

interface MapContainerProps {
  children: ReactNode;
}

/**
 * MapContainer — Leaflet map wrapper with OpenStreetMap tiles
 * Zero business logic, only renders backend data passed as children
 */
export function MapContainer({ children }: MapContainerProps) {
  // Fix for default marker icon issue in Next.js
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: '/leaflet/marker-icon-2x.png',
          iconUrl: '/leaflet/marker-icon.png',
          shadowUrl: '/leaflet/marker-shadow.png',
        });
      });
    }
  }, []);

  // Center of India (approximate)
  const center: [number, number] = [23.5, 78.5];
  const zoom = 6;

  return (
    <LeafletMapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </LeafletMapContainer>
  );
}
