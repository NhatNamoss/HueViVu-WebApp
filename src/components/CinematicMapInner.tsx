'use client';
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { validRoutePoint, type TripRoute } from '@/lib/navigation-route';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const TYPE_EMOJI: Record<string, string> = {
  heritage: '🏛️', food: '🍜', nature: '🌿', temple: '🛕',
  cafe: '☕', market: '🛍️', experience: '🎭', craft_village: '🎨',
};

const createMarker = (emoji: string, index: number) => new L.DivIcon({
  html: `<div style="background:linear-gradient(135deg,#FF7F6B,#FF9A5C);width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(255,127,107,0.5);border:2.5px solid white;font-size:16px;position:relative;">
    ${emoji}
    <span style="position:absolute;bottom:-2px;right:-2px;background:#1A1D3B;color:white;border-radius:50%;width:16px;height:16px;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;border:1.5px solid white;">${index + 1}</span>
  </div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const USER_ICON = new L.DivIcon({
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.25),0 2px 8px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 0) map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 16 });
  }, [coords, map]);
  return null;
}

function MapResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function MapFollower({ location, follow, onPan }: { location: { lat: number; lng: number } | null; follow: boolean; onPan?: () => void }) {
  const map = useMapEvents({ dragstart: () => onPan?.() });
  const lat = location?.lat, lng = location?.lng;
  useEffect(() => { if (follow && lat !== undefined && lng !== undefined) map.setView([lat, lng], Math.max(17, map.getZoom())); }, [follow, lat, lng, map]);
  return null;
}

// Hue center fallback
const HUE_CENTER: [number, number] = [16.4637, 107.5909];

export default function CinematicMapInner({ activities, activeIndex, userLocation, route, onSelect, completedIndexes = [], follow = false, onPan }: {
  activities: any[]; activeIndex?: number; userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  route?: TripRoute | null; onSelect?: (index: number) => void; completedIndexes?: number[]; follow?: boolean; onPan?: () => void;
}) {
  const mapped = useMemo(() => (activities || []).flatMap((activity, index) => {
    const point = validRoutePoint(activity);
    return point ? [{ ...activity, ...point, index }] : [];
  }), [activities]);
  const pinCoords = useMemo<[number, number][]>(() => mapped.map(activity => [activity.lat, activity.lng]), [mapped]);
  const path = useMemo<[number, number][]>(() => route && route.provider !== 'google' ? route.points.map(point => [point.lat, point.lng]) : [], [route]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <MapContainer center={HUE_CENTER} zoom={14} style={{ width: '100%', height: '100%', zIndex: 1 }} zoomControl={true}>
        <MapResize />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />
        {path.length > 1 && (
          <>
            <Polyline positions={path} pathOptions={{ color: '#FFFFFF', weight: 10, opacity: 0.85 }} />
            <Polyline positions={path} pathOptions={{ color: '#2563EB', weight: 6, opacity: 0.95 }} />
          </>
        )}
        {(path.length > 0 || pinCoords.length > 0) && <MapBounds coords={path.length ? path : pinCoords} />}
        <MapFollower location={userLocation || null} follow={follow === true} onPan={onPan} />
        {mapped.map(act => (
          <Marker key={act.index} position={[act.lat, act.lng]} icon={createMarker(completedIndexes.includes(act.index) ? '✓' : TYPE_EMOJI[act.type] || '📍', act.itineraryIndex ?? act.index)}
            zIndexOffset={activeIndex === act.index ? 1000 : 0}>
            <Popup>
              <div style={{ padding: '6px 2px', minWidth: 160 }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#1A1D3B', fontSize: 13 }}>{act.name}</p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: '#666' }}>{act.time} · {act.duration}</p>
                {act.cost && <p style={{ margin: '3px 0 0', fontSize: 11, color: '#FF7F6B', fontWeight: 600 }}>{act.cost}</p>}
                {onSelect && <button onClick={() => onSelect(act.index)} style={{ display: 'inline-block', minHeight: 44, marginTop: 6, padding: '7px 10px', border: 'none', borderRadius: 12, background: '#FF7F6B', color: 'white', fontWeight: 700 }}>Xem đường trong HueViVu</button>}
              </div>
            </Popup>
          </Marker>
        ))}
        {userLocation && (
          <>
          {Number.isFinite(userLocation.accuracy) && <Circle center={[userLocation.lat, userLocation.lng]} radius={userLocation.accuracy!} pathOptions={{ color: '#2563EB', weight: 1, opacity: 0.4, fillOpacity: 0.1 }} />}
          <Marker position={[userLocation.lat, userLocation.lng]} icon={USER_ICON} zIndexOffset={2000}>
            <Popup><p style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>📍 Vị trí của bạn</p></Popup>
          </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
}

