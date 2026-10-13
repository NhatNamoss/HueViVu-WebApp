// Shared by the trip screen and the standalone offline reader.
const PREFIX = 'huevivu:offline-trip:';
const VERSION = 2;
const MAX_TRIPS = 6;
const MAX_AGE = 30 * 86400000;

function storage() {
  try { return typeof window === 'undefined' ? null : window.localStorage; }
  catch { return null; }
}
function owner() {
  try {
    const token = storage()?.getItem('hv_token');
    if (!token) return null;
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encoded));
    // Local account separation only. API authorization still verifies the JWT.
    return typeof payload.userId === 'string' && payload.userId &&
      Number.isFinite(payload.exp) && payload.exp * 1000 > Date.now() ? payload.userId : null;
  } catch { return null; }
}
function keys(store) {
  return Array.from({ length: store.length }, (_, i) => store.key(i))
    .filter(key => key?.startsWith(PREFIX));
}
function validTrip(data, tripId) {
  return data && data.id === tripId && typeof data.title === 'string' &&
    data.itinerary && Array.isArray(data.itinerary.days) &&
    data.itinerary.days.length > 0 && data.itinerary.days.length <= 7 &&
    data.itinerary.days.every(day => day && Array.isArray(day.activities) &&
      day.activities.every(activity => activity && typeof activity.name === 'string'));
}
export function readCachedTrip(tripId) {
  try {
    const currentOwner = owner();
    if (!currentOwner) return null;
    const payload = JSON.parse(storage()?.getItem(PREFIX + tripId) || 'null');
    return payload?.version === VERSION && payload.ownerId === currentOwner &&
      Number.isFinite(payload.savedAt) && payload.savedAt <= Date.now() &&
      Date.now() - payload.savedAt <= MAX_AGE && validTrip(payload.data, tripId)
      ? payload : null;
  } catch { return null; }
}
export function listCachedTrips() {
  const store = storage();
  if (!store) return [];
  return keys(store).reverse().map(key => readCachedTrip(key.slice(PREFIX.length)))
    .filter(Boolean).sort((a, b) => b.savedAt - a.savedAt);
}
export function cacheTrip(tripId, source) {
  try {
    const store = storage();
    const currentOwner = owner();
    if (!store || !currentOwner || source?.user_id !== currentOwner || !validTrip(source, tripId)) return false;
    // Keep road essentials rather than account details or location history.
    const data = {
      id: source.id, title: source.title, summary: source.summary,
      duration: source.duration, total_cost_estimate: source.total_cost_estimate,
      itinerary: { days: source.itinerary.days.map(day => ({
        day: day.day, theme: day.theme, day_tip: day.day_tip,
        activities: day.activities.map(activity => ({
          time: activity.time, name: activity.name, duration: activity.duration,
          cost: activity.cost, location: activity.location, description: activity.description,
          lat: activity.lat, lng: activity.lng,
        })),
      })) },
    };
    keys(store).forEach(key => { if (!readCachedTrip(key.slice(PREFIX.length))) store.removeItem(key); });
    store.setItem(PREFIX + tripId, JSON.stringify({ version: VERSION, ownerId: currentOwner, savedAt: Date.now(), data }));
    listCachedTrips().slice(MAX_TRIPS).forEach(item => store.removeItem(PREFIX + item.data.id));
    return true;
  } catch { return false; }
}
export function removeCachedTrip(tripId) {
  try { storage()?.removeItem(PREFIX + tripId); } catch { /* Storage may be disabled. */ }
}
export function clearCachedTrips() {
  try {
    const store = storage();
    if (store) keys(store).forEach(key => store.removeItem(key));
  } catch { /* Logout still succeeds when storage is unavailable. */ }
}
