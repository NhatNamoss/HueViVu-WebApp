'use client';
import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

function MapBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 0) map.fitBounds(L.latLngBounds(coords), { padding: [60, 60] });
  }, [coords, map]);
  return null;
}

// Hue center fallback
const HUE_CENTER: [number, number] = [16.4637, 107.5909];

export default function CinematicMapInner({ activities, activeIndex }: { activities: any[]; activeIndex?: number }) {
  const [route, setRoute] = useState<[number, number][]>([]);

  // Stable coords: computed once per activities identity — no jitter on re-render
  const mapped = useMemo(() => (activities || []).map((act, i) => ({
    ...act,
    lat: (typeof act.lat === 'number' && act.lat > 15 && act.lat < 17) ? act.lat : HUE_CENTER[0] + (i * 0.0002 - 0.0001),
    lng: (typeof act.lng === 'number' && act.lng > 100 && act.lng < 110) ? act.lng : HUE_CENTER[1] + (i * 0.0002 - 0.0001),
  })), [activities]);

  const pinCoords: [number, number][] = mapped.map(a => [a.lat, a.lng]);

  useEffect(() => {
    if (mapped.length < 2) return;
    const coords = mapped.map(a => `${a.lng},${a.lat}`).join(';');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    fetch(`https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=geojson`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => {
        clearTimeout(t);
        if (data.routes?.[0]) {
          setRoute(data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]));
        } else {
          setRoute(mapped.map(a => [a.lat, a.lng]));
        }
      })
      .catch(() => setRoute(mapped.map(a => [a.lat, a.lng])));
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [mapped]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <MapContainer center={HUE_CENTER} zoom={14} style={{ width: '100%', height: '100%', zIndex: 1 }} zoomControl={true}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />
        {route.length > 1 && (
          <>
            <Polyline positions={route} pathOptions={{ color: '#FF7F6B', weight: 8, opacity: 0.25 }} />
            <Polyline positions={route} pathOptions={{ color: '#FF9A5C', weight: 3, opacity: 0.9, dashArray: '8,8' }} />
          </>
        )}
        {pinCoords.length > 0 && <MapBounds coords={pinCoords} />}
        {mapped.map((act, i) => (
          <Marker key={i} position={[act.lat, act.lng]} icon={createMarker(TYPE_EMOJI[act.type] || '📍', i)}
            zIndexOffset={activeIndex === i ? 1000 : 0}>
            <Popup>
              <div style={{ padding: '6px 2px', minWidth: 160 }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#1A1D3B', fontSize: 13 }}>{act.name}</p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: '#666' }}>{act.time} · {act.duration}</p>
                {act.cost && <p style={{ margin: '3px 0 0', fontSize: 11, color: '#FF7F6B', fontWeight: 600 }}>{act.cost}</p>}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${act.lat},${act.lng}&travelmode=walking`}
                  target="_blank" rel="noreferrer"
                  style={{ display: 'inline-block', marginTop: 6, fontSize: 11, color: 'white', background: '#FF7F6B', padding: '4px 10px', borderRadius: 20, fontWeight: 600, textDecoration: 'none' }}
                >
                  🗺️ Chỉ đường
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

