import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

let user = 'owner', calls = 0;
const itinerary = { days: [{ activities: [
  { name: 'Chợ Đông Ba', lat: 16.473, lng: 107.591 },
  { name: 'Cầu Tràng Tiền', lat: 16.467, lng: 107.589 },
] }] };
const trip = { user_id: 'owner', is_shared: 1, itinerary: JSON.stringify(itinerary), status: 'active', start_date: '2026-10-13' };
const db = { prepare(sql) {
  assert.ok(!/\b(INSERT|UPDATE|DELETE)\b/i.test(sql), 'route endpoint must not write trip or GPS');
  return { get(...args) {
    if (sql.includes('FROM trips')) return args[0] === 'trip' && (!sql.includes('user_id=?') || args[1] === 'owner') ? trip : undefined;
    if (sql.includes('FROM trip_state')) return { started_at: '2026-10-13T01:00:00Z' };
    return undefined;
  } };
} };
const point = { lat: 16.473, lng: 107.591 };
const mocks = {
  '@/lib/db': { getDb: () => db },
  '@/lib/auth': { getAuthUserId: () => user },
  '@/lib/navigation-route': {
    googleRoutingConfigured: () => false,
    valhallaEndpoint: () => 'https://routing.test/route',
    itineraryFingerprint: () => 'snapshot',
    validRoutePoint: value => value && Number.isFinite(value.lat) && Number.isFinite(value.lng) && value.lat > 15 && value.lat < 17 ? value : null,
    computeRoute: async (origin, destination, destinationIndex, mode, snapshot) => {
      calls++;
      return { provider: 'osrm_preview', mode, origin, destination, destinationIndex, points: [origin, destination], distanceMeters: 800, durationSeconds: 640, steps: [], computedAt: new Date().toISOString(), itinerarySnapshot: snapshot };
    },
  },
  '@/lib/travel-clock': { tripDayIndex: () => 0 },
  '@/lib/place-trust': { evaluatePlaceTrust: () => ({ operationalFresh: false }) },
  '@/lib/opening-hours': { getOpeningStatus: () => ({ status: 'unknown', label: '' }), parseOpeningHours: () => null },
  '@/lib/trip-state': { normalizeTripState: () => ({ startedAt: '2026-10-13T01:00:00Z' }), getDayProgress: () => ({ completedActivityIndexes: [] }) },
};
const source = fs.readFileSync('src/app/api/trips/[id]/route/route.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename: 'route.ts' })(name => {
  assert.ok(name in mocks, `unexpected import: ${name}`);
  return mocks[name];
}, module, module.exports);
const context = { params: Promise.resolve({ id: 'trip' }) };
const post = async body => module.exports.POST(new Request('http://localhost/api/trips/trip/route', { method: 'POST', body: JSON.stringify(body) }), context);
const input = { dayIndex: 0, targetIndex: 1, scope: 'point', mode: 'WALK' };
let response = await module.exports.GET(new Request('http://localhost/api/trips/trip/route'), context);
assert.equal((await response.json()).canNavigate, true);
assert.equal(response.headers.get('cache-control'), 'private, no-store');
user = 'other';
response = await module.exports.GET(new Request('http://localhost/api/trips/trip/route'), context);
assert.equal((await response.json()).canNavigate, false);
assert.equal((await post(input)).status, 404);
user = null;
assert.equal((await post(input)).status, 401);
user = 'owner';
assert.equal((await post({ ...input, mode: 'DRIVE' })).status, 400);
assert.equal((await post({ ...input, origin: { lat: 0, lng: 0 } })).status, 400);
assert.equal((await post({ ...input, targetIndex: 8 })).status, 400);
assert.equal((await post(input)).status, 422, 'current GPS origin is required; previous activity is not an origin');
response = await post({ ...input, origin: point });
assert.equal(response.status, 200);
assert.equal((await response.json()).route.destinationIndex, 1);
assert.equal(calls, 1);
response = await post({ ...input, origin: point });
assert.equal(response.status, 200);
assert.equal(calls, 2);
console.log('PASS navigation API: owner/shared access, no GPS writes, invalid input, mode gate and route response');
