'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// Fijar icono de Leaflet
const markerIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Location {
  lat: number;
  lng: number;
  label: string;
  timestamp?: Date;
}

interface MapViewerProps {
  locations: Location[];
  center?: [number, number];
  zoom?: number;
  height?: string;
}

function MapContent({ locations, center, zoom }: Pick<MapViewerProps, 'locations' | 'center' | 'zoom'>) {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0 && !center) {
      const bounds = L.latLngBounds(locations.map(l => [l.lat, l.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, map, center]);

  return (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {locations.map((loc, idx) => (
        <Marker key={idx} position={[loc.lat, loc.lng]} icon={markerIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{loc.label}</p>
              {loc.timestamp && (
                <p className="text-xs text-gray-600">
                  {new Date(loc.timestamp).toLocaleString('es-CL')}
                </p>
              )}
              <p className="text-xs text-gray-500">
                {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export function MapViewer({
  locations,
  center = [-33.8688, -51.5386],
  zoom = 13,
  height = '400px',
}: MapViewerProps) {
  if (locations.length === 0) {
    return (
      <div
        style={{ height }}
        className="bg-gray-100 rounded-lg flex items-center justify-center border border-gray-300"
      >
        <p className="text-gray-600">Sin ubicaciones para mostrar</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, borderRadius: '0.5rem' }}
      className="border border-gray-300"
    >
      <MapContent locations={locations} center={center} zoom={zoom} />
    </MapContainer>
  );
}
