'use client';

import { memo, useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { Hub } from '@/lib/api';
import { riskMarkerColor } from '@/lib/utils';

interface HubMarkerProps {
  hub: Hub;
  onClick: (hub: Hub) => void;
}

/**
 * HubMarker — Displays a single hub on the map
 * Color-coded by risk level, clickable to open detail panel
 */
export const HubMarker = memo(function HubMarker({ hub, onClick }: HubMarkerProps) {
  const riskLevel = hub.riskScore?.riskLevel ?? 'low';
  const lat = Number(hub.latitude);
  const lng = Number(hub.longitude);

  const icon = useMemo(() => {
    const color = riskMarkerColor(riskLevel);
    return new DivIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: ${color};
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  }, [riskLevel]);

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      eventHandlers={{
        click: () => onClick(hub),
      }}
    >
      <Popup>
        <div className="text-xs">
          <div className="font-semibold">{hub.name}</div>
          <div className="text-slate-400">{hub.city}, {hub.state}</div>
        </div>
      </Popup>
    </Marker>
  );
});
