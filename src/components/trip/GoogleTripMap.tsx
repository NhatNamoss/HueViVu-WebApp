'use client';
import { useEffect, useRef, useState } from 'react';
import { validRoutePoint, type RoutePoint, type TripRoute } from '@/lib/navigation-route';

type Props = { activities: Array<{ name: string; lat?: number; lng?: number }>; route: TripRoute | null;
  position: RoutePoint | null; accuracy: number | null; selectedIndex: number; onSelect: (index: number) => void };

let loader: Promise<void> | null = null;
function loadMaps(key: string): Promise<void> {
  const browser = window as typeof window & { google?: any; huevivuMapsReady?: () => void };
  if (browser.google?.maps?.importLibrary) return Promise.resolve();
  if (!loader) loader = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => { script.remove(); reject(new Error('Map timeout')); }, 15000);
    browser.huevivuMapsReady = () => { clearTimeout(timeout); delete browser.huevivuMapsReady; resolve(); };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=huevivuMapsReady`;
    script.async = true;
    script.onerror = () => { clearTimeout(timeout); script.remove(); delete browser.huevivuMapsReady; reject(new Error('Map unavailable')); };
    document.head.appendChild(script);
  }).catch(error => { loader = null; throw error; });
  return loader;
}

export default function GoogleTripMap({ activities, route, position, accuracy, selectedIndex, onSelect }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const userMarker = useRef<any>(null);
  const accuracyCircle = useRef<any>(null);
  const line = useRef<any>(null);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  onSelectRef.current = onSelect;
  useEffect(() => {
    let cancelled = false;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
    if (!key || !process.env.NEXT_PUBLIC_GOOGLE_MAP_ID) { setError('Bản đồ Google chưa được cấu hình.'); return; }
    loadMaps(key).then(async () => {
      const google = (window as any).google;
      const { Map } = await google.maps.importLibrary('maps');
      await google.maps.importLibrary('marker');
      if (cancelled || !host.current) return;
      map.current = new Map(host.current, { center: { lat: 16.4637, lng: 107.5909 }, zoom: 14, mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID, mapTypeControl: false, streetViewControl: false });
      setReady(true);
    }).catch(() => { if (!cancelled) setError('Chưa tải được bản đồ Google. Hãy kiểm tra mạng và khóa bản đồ.'); });
    return () => { cancelled = true; markers.current.forEach(marker => { marker.map = null; }); if (userMarker.current) userMarker.current.map = null; line.current?.setMap(null); accuracyCircle.current?.setMap(null); map.current = null; };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    const google = (window as any).google;
    markers.current.forEach(marker => { marker.map = null; });
    markers.current = activities.flatMap((activity, index) => {
      const point = validRoutePoint(activity);
      if (!point) return [];
      const pin = new google.maps.marker.PinElement({ glyph: String(index + 1), background: index === selectedIndex ? '#B45309' : '#FF7F6B', borderColor: '#FFFFFF', glyphColor: '#FFFFFF' });
      const marker = new google.maps.marker.AdvancedMarkerElement({ map: map.current, position: point, title: `${index + 1}. ${activity.name}`, content: pin.element, gmpClickable: true });
      marker.addListener('click', () => onSelectRef.current(index));
      return [marker];
    });
    const bounds = new google.maps.LatLngBounds();
    markers.current.forEach(marker => bounds.extend(marker.position));
    if (!bounds.isEmpty()) map.current.fitBounds(bounds, 42);
    return () => { markers.current.forEach(marker => { marker.map = null; }); markers.current = []; };
  }, [activities, selectedIndex, ready]);
  useEffect(() => {
    if (!ready || !map.current) return;
    const google = (window as any).google;
    line.current?.setMap(null);
    if (route?.provider === 'google' && route.points.length > 1) {
      line.current = new google.maps.Polyline({ map: map.current, path: route.points, geodesic: false, strokeColor: '#D55D42', strokeOpacity: 0.95, strokeWeight: 5 });
      const bounds = new google.maps.LatLngBounds();
      route.points.forEach(point => bounds.extend(point));
      map.current.fitBounds(bounds, 45);
    }
    return () => line.current?.setMap(null);
  }, [route, ready]);
  useEffect(() => {
    if (!ready || !map.current) return;
    const google = (window as any).google;
    if (userMarker.current) userMarker.current.map = null;
    accuracyCircle.current?.setMap(null);
    if (position) {
      const pin = new google.maps.marker.PinElement({ background: '#2563EB', borderColor: '#FFFFFF', glyphColor: '#FFFFFF' });
      userMarker.current = new google.maps.marker.AdvancedMarkerElement({ map: map.current, position, title: 'Vị trí của bạn', content: pin.element });
      if (accuracy && Number.isFinite(accuracy)) accuracyCircle.current = new google.maps.Circle({ map: map.current, center: position, radius: accuracy, fillColor: '#2563EB', fillOpacity: 0.12, strokeColor: '#2563EB', strokeOpacity: 0.3, strokeWeight: 1 });
    }
    return () => { if (userMarker.current) userMarker.current.map = null; accuracyCircle.current?.setMap(null); };
  }, [position, accuracy, ready]);
  return <div style={{ width: '100%', height: '100%', position: 'relative' }}>
    <div ref={host} aria-label="Bản đồ Google của hành trình" style={{ width: '100%', height: '100%' }} />
    {(error || !ready) && <div role="status" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'var(--soft-white)', padding: 20, textAlign: 'center', fontSize: '.85rem' }}>{error || 'Đang tải bản đồ Google…'}</div>}
  </div>;
}
