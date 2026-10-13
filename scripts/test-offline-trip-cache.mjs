import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../public/offline-trip-store.js', import.meta.url), 'utf8');
const store = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const entries = new Map();
const localStorage = {
  get length() { return entries.size; },
  key(i) { return [...entries.keys()][i] ?? null; },
  getItem(key) { return entries.get(key) ?? null; },
  setItem(key, value) { entries.set(key, value); },
  removeItem(key) { entries.delete(key); },
};
globalThis.window = { localStorage };
const token = (userId, exp = Date.now() / 1000 + 3600) => 'header.' + Buffer.from(JSON.stringify({ userId, exp })).toString('base64url') + '.signature';
const trip = { id: 'trip-a', user_id: 'owner-a', title: 'Huế hai ngày', email: 'private@example.com', lastLocation: { lat: 1, lng: 2 }, itinerary: { days: [{ day: 1, activities: [{ name: 'Đại Nội', time: '08:00', location: 'Huế' }] }] } };
localStorage.setItem('hv_token', token('owner-a'));
assert.equal(store.cacheTrip('trip-a', trip), true);
assert.equal(store.readCachedTrip('trip-a').data.itinerary.days[0].activities[0].time, '08:00');
assert.equal(store.readCachedTrip('trip-a').data.email, undefined);
assert.equal(store.readCachedTrip('trip-a').data.lastLocation, undefined);
assert.equal(store.readCachedTrip('trip-a').data.user_id, undefined);
assert.equal(store.cacheTrip('trip-b', { ...trip, id: 'trip-b', user_id: 'owner-b' }), false);
localStorage.setItem('hv_token', token('owner-b'));
assert.equal(store.readCachedTrip('trip-a'), null);
assert.equal(store.listCachedTrips().length, 0);
localStorage.setItem('hv_token', token('owner-a'));
let snapshot = JSON.parse(localStorage.getItem('huevivu:offline-trip:trip-a'));
snapshot.savedAt = Date.now() - 31 * 86400000;
localStorage.setItem('huevivu:offline-trip:trip-a', JSON.stringify(snapshot));
assert.equal(store.readCachedTrip('trip-a'), null);
localStorage.setItem('huevivu:offline-trip:legacy', JSON.stringify({ data: trip, savedAt: Date.now() }));
assert.equal(store.readCachedTrip('legacy'), null);
localStorage.setItem('huevivu:offline-trip:broken', '{');
assert.equal(store.readCachedTrip('broken'), null);
assert.equal(store.cacheTrip('invalid', { ...trip, id: 'invalid', itinerary: { days: [{ activities: [null] }] } }), false);
for (let i = 0; i < 8; i++) store.cacheTrip('trip-' + i, { ...trip, id: 'trip-' + i });
assert.equal(store.listCachedTrips().length, 6);
assert.ok(store.readCachedTrip('trip-7'));
assert.equal(localStorage.getItem('huevivu:offline-trip:legacy'), null);
localStorage.setItem('hv_token', token('owner-a', 0));
assert.equal(store.listCachedTrips().length, 0);
localStorage.setItem('hv_token', token('owner-a'));
store.clearCachedTrips();
assert.equal(store.listCachedTrips().length, 0);
assert.ok(localStorage.getItem('hv_token'));
globalThis.window = { get localStorage() { throw new Error('blocked'); } };
assert.equal(store.cacheTrip('trip-a', trip), false);
assert.equal(store.readCachedTrip('trip-a'), null);
assert.deepEqual(store.listCachedTrips(), []);
store.clearCachedTrips();
delete globalThis.window;
assert.equal(store.cacheTrip('trip-a', trip), false);
console.log('PASS offline snapshots: ownership, expiry, corruption, minimization, capacity, logout and unavailable storage');
