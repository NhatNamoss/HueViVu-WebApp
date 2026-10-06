'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCategoryMeta } from '@/lib/place-taxonomy';

const HUE_CENTER: [number, number] = [16.4637, 107.5909];
const USER_ICON = new L.DivIcon({
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,.2)"></div>',
  className: '', iconSize: [18, 18], iconAnchor: [9, 9],
});
function markerIcon(category: string, selected: boolean) {
  const emoji = getCategoryMeta(category)?.emoji || '📍';
  const size = selected ? 44 : 36;
  return new L.DivIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:16px 16px 16px 4px;transform:rotate(-45deg);background:${selected ? '#1A1D3B' : 'linear-gradient(135deg,#FF7F6B,#FF9A5C)'};display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 5px 16px rgba(26,29,59,.25)"><span style="transform:rotate(45deg);font-size:${selected ? 19 : 16}px">${emoji}</span></div>`,
    className: '', iconSize: [size, size], iconAnchor: [size / 2, size],
  });
}
function FitBounds({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates.length === 1) map.setView(coordinates[0], 15);
    else if (coordinates.length > 1) map.fitBounds(L.latLngBounds(coordinates), { padding: [38, 38], maxZoom: 15 });
  }, [coordinates, map]);
  return null;
}

export default function ExploreMapInner({ places, selectedId, onSelect, userLocation }: {
  places: any[]; selectedId?: string | null; onSelect?: (id: string) => void;
  userLocation?: { lat: number; lng: number } | null;
}) {
  const valid = useMemo(() => places.filter(place => Number(place.lat) > 15 && Number(place.lat) < 17 && Number(place.lng) > 106 && Number(place.lng) < 109), [places]);
  const coordinates = useMemo(() => valid.map(place => [Number(place.lat), Number(place.lng)] as [number, number]), [valid]);
  return <MapContainer center={HUE_CENTER} zoom={13} style={{ width: '100%', height: '100%', zIndex: 1 }}>
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>' />
    <FitBounds coordinates={coordinates} />
    {valid.map(place => <Marker key={place.id} position={[Number(place.lat), Number(place.lng)]} icon={markerIcon(place.category, selectedId === place.id)} eventHandlers={{ click: () => onSelect?.(place.id) }}>
      <Popup><div style={{ minWidth: 180 }}><p style={{ fontWeight: 800, margin: '0 0 4px', color: '#1A1D3B' }}>{place.name}</p><p style={{ fontSize: 11, color: '#6B6E8A', margin: '0 0 5px' }}>{place.address || 'Huế'}</p><p style={{ fontSize: 11, margin: '0 0 8px' }}>⭐ {place.rating || 4.5} · {place.price || 'Chưa cập nhật'}</p><a href={`/places/${place.id}`} style={{ color: 'white', background: '#FF7F6B', padding: '5px 10px', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>Xem chi tiết →</a></div></Popup>
    </Marker>)}
    {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={USER_ICON}><Popup>Vị trí của bạn</Popup></Marker>}
  </MapContainer>;
}
