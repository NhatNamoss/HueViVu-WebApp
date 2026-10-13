export type RoutePoint = { lat: number; lng: number };
export type RouteStep = { instruction: string; distanceMeters: number; location: RoutePoint | null };
export type TripRoute = {
  provider: 'google' | 'osrm_preview' | 'valhalla'; mode: 'WALK' | 'DRIVE';
  origin: RoutePoint; destination: RoutePoint; destinationIndex: number;
  points: RoutePoint[]; distanceMeters: number; durationSeconds: number;
  steps: RouteStep[]; computedAt: string; itinerarySnapshot: string;
  arrivalStatus?: { status: 'open' | 'closing_soon' | 'closed' | 'unknown'; label: string; checkedAt?: string | null };
};

export function itineraryFingerprint(value: unknown): string {
  const normalized = typeof value === 'string' ? JSON.stringify(JSON.parse(value)) : JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index++) hash = Math.imul(hash ^ normalized.charCodeAt(index), 16777619);
  return `${(hash >>> 0).toString(16)}:${normalized.length}`;
}

export function validRoutePoint(value: unknown): RoutePoint | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const lat = Number(raw.lat), lng = Number(raw.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 15 || lat > 17.5 || lng < 106 || lng > 109) return null;
  return { lat, lng };
}

export function routeDistanceMeters(a: RoutePoint, b: RoutePoint) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(value)));
}

export function nearestRouteProgress(points: RoutePoint[], position: RoutePoint) {
  if (points.length < 2) return null;
  let total = 0, nearest = Infinity, progress = 0, covered = 0;
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1], b = points[index];
    const scale = Math.cos(position.lat * Math.PI / 180);
    const dx = (b.lng - a.lng) * scale, dy = b.lat - a.lat;
    const projection = dx * dx + dy * dy;
    const fraction = projection ? Math.max(0, Math.min(1, ((position.lng - a.lng) * scale * dx + (position.lat - a.lat) * dy) / projection)) : 0;
    const closest = { lat: a.lat + (b.lat - a.lat) * fraction, lng: a.lng + (b.lng - a.lng) * fraction };
    const error = routeDistanceMeters(position, closest);
    const segment = routeDistanceMeters(a, b);
    if (error < nearest) { nearest = error; progress = covered + segment * fraction; }
    covered += segment; total += segment;
  }
  return { offRouteMeters: nearest, fraction: total ? Math.max(0, Math.min(1, progress / total)) : 0, remainingMeters: Math.max(0, total - progress), traveledMeters: progress };
}

export function routeGuidance(route: TripRoute, position: RoutePoint) {
  const progress = nearestRouteProgress(route.points, position);
  if (!progress) return null;
  const maneuvers = route.steps.flatMap((step, index) => {
    const at = step.location ? nearestRouteProgress(route.points, step.location) : null;
    return at ? [{ step, index, at }] : [];
  });
  const next = maneuvers.find(item => item.at.traveledMeters > progress.traveledMeters + 12);
  const current = [...maneuvers].reverse().find(item => item.at.traveledMeters <= progress.traveledMeters + 12);
  return { ...progress, instruction: current?.step.instruction || route.steps[0]?.instruction || 'Đi theo tuyến trên bản đồ',
    nextInstruction: next?.step.instruction || null, turnMeters: next ? Math.max(0, next.at.traveledMeters - progress.traveledMeters) : null };
}

function cleanPath(raw: unknown, reversed = false): RoutePoint[] {
  if (!Array.isArray(raw) || raw.length > 20000) return [];
  const points = raw.map(value => Array.isArray(value) && value.length >= 2
    ? validRoutePoint({ lat: value[reversed ? 1 : 0], lng: value[reversed ? 0 : 1] }) : null);
  return points.every(Boolean) ? points as RoutePoint[] : [];
}

function routeTime(raw: unknown): number {
  const value = typeof raw === 'string' && raw.endsWith('s') ? Number(raw.slice(0, -1)) : Number(raw);
  return Number.isFinite(value) && value > 0 && value < 24 * 3600 ? value : 0;
}

function routeDistance(raw: unknown): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 && value < 500000 ? value : 0;
}

function osrmInstruction(step: any): string {
  const maneuver = step?.maneuver || {}, road = String(step?.name || '').trim().slice(0, 120);
  const base = maneuver.type === 'depart' ? 'Bắt đầu đi' : maneuver.type === 'arrive' ? 'Đến điểm cần tới'
    : maneuver.type === 'roundabout' || maneuver.type === 'rotary' ? 'Đi qua vòng xuyến'
    : /left/.test(maneuver.modifier || '') ? 'Rẽ trái'
    : /right/.test(maneuver.modifier || '') ? 'Rẽ phải' : 'Tiếp tục đi';
  return road && maneuver.type !== 'arrive' ? `${base} vào ${road}` : base;
}

export function normalizeOsrmRoute(data: any, origin: RoutePoint, destination: RoutePoint, destinationIndex: number, snapshot: string, now = new Date()): TripRoute | null {
  const route = data?.code === 'Ok' ? data.routes?.[0] : null;
  const points = cleanPath(route?.geometry?.coordinates, true);
  const distanceMeters = routeDistance(route?.distance);
  if (points.length < 2 || !distanceMeters || !Array.isArray(route.legs)) return null;
  // The public OSRM demo may ignore the requested foot profile. Estimate walking time from distance.
  const durationSeconds = Math.ceil(distanceMeters / 1.25);
  const steps: RouteStep[] = route.legs.flatMap((leg: any) => Array.isArray(leg?.steps) ? leg.steps.map((step: any) => ({
    instruction: osrmInstruction(step), distanceMeters: Math.max(0, Number(step.distance) || 0),
    location: validRoutePoint({ lat: step.maneuver?.location?.[1], lng: step.maneuver?.location?.[0] }),
  })) : []);
  return { provider: 'osrm_preview', mode: 'WALK', origin, destination, destinationIndex, points, distanceMeters, durationSeconds, steps, computedAt: now.toISOString(), itinerarySnapshot: snapshot };
}

export function normalizeGoogleRoute(data: any, origin: RoutePoint, destination: RoutePoint, destinationIndex: number, mode: 'WALK' | 'DRIVE', snapshot: string, now = new Date()): TripRoute | null {
  const route = data?.routes?.[0];
  const points = cleanPath(route?.polyline?.geoJsonLinestring?.coordinates, true);
  const distanceMeters = routeDistance(route?.distanceMeters), durationSeconds = routeTime(route?.duration);
  if (points.length < 2 || !distanceMeters || !durationSeconds || !Array.isArray(route.legs)) return null;
  const steps: RouteStep[] = route.legs.flatMap((leg: any) => Array.isArray(leg?.steps) ? leg.steps.flatMap((step: any) => {
    const instruction = typeof step.navigationInstruction?.instructions === 'string' ? step.navigationInstruction.instructions.trim().slice(0, 280) : '';
    return instruction ? [{ instruction, distanceMeters: Math.max(0, Number(step.distanceMeters) || 0), location: validRoutePoint({ lat: step.startLocation?.latLng?.latitude, lng: step.startLocation?.latLng?.longitude }) }] : [];
  }) : []);
  return { provider: 'google', mode, origin, destination, destinationIndex, points, distanceMeters, durationSeconds, steps, computedAt: now.toISOString(), itinerarySnapshot: snapshot };
}

export function googleRoutingConfigured() {
  return Boolean(process.env.GOOGLE_MAPS_SERVER_KEY && process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY && process.env.NEXT_PUBLIC_GOOGLE_MAP_ID);
}

export function valhallaEndpoint() {
  return process.env.VALHALLA_URL || (process.env.NODE_ENV !== 'production' ? 'https://valhalla1.openstreetmap.de/route' : '');
}

export function normalizeValhallaRoute(data: any, origin: RoutePoint, destination: RoutePoint, destinationIndex: number, snapshot: string, now = new Date()): TripRoute | null {
  const route = normalizeOsrmRoute(data, origin, destination, destinationIndex, snapshot, now);
  const duration = routeTime(data?.routes?.[0]?.duration);
  return route && duration ? { ...route, provider: 'valhalla', durationSeconds: duration } : null;
}

export async function computeRoute(origin: RoutePoint, destination: RoutePoint, destinationIndex: number, mode: 'WALK' | 'DRIVE', snapshot: string, intermediates: RoutePoint[] = []): Promise<TripRoute | null> {
  if (routeDistanceMeters(origin, destination) < 20) return null;
  if (intermediates.length > 18 || intermediates.some(point => !validRoutePoint(point))) return null;
  if (googleRoutingConfigured()) {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': process.env.GOOGLE_MAPS_SERVER_KEY!,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.geoJsonLinestring,routes.legs.steps.distanceMeters,routes.legs.steps.navigationInstruction,routes.legs.steps.startLocation' },
      body: JSON.stringify({ origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } }, destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        ...(intermediates.length ? { intermediates: intermediates.map(point => ({ location: { latLng: { latitude: point.lat, longitude: point.lng } } })) } : {}),
        travelMode: mode, languageCode: 'vi', units: 'METRIC', polylineEncoding: 'GEO_JSON_LINESTRING', polylineQuality: 'OVERVIEW', ...(mode === 'DRIVE' ? { routingPreference: 'TRAFFIC_AWARE' } : {}) }),
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return normalizeGoogleRoute(await response.json(), origin, destination, destinationIndex, mode, snapshot);
  }
  if (mode !== 'WALK') return null;
  const endpoint = valhallaEndpoint();
  if (!endpoint) return null;
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-Id': process.env.ROUTING_CLIENT_ID || 'HueViVu-local-development' },
    body: JSON.stringify({ locations: [origin, ...intermediates, destination].map(point => ({ lat: point.lat, lon: point.lng })), costing: 'pedestrian', format: 'osrm', shape_format: 'geojson', units: 'kilometers', language: 'en-US' }),
    cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  return normalizeValhallaRoute(await response.json(), origin, destination, destinationIndex, snapshot);
}
