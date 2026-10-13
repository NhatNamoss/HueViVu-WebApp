import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(relative) {
  const file = path.resolve(relative);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: file })(request => request.startsWith('.') ? load(path.resolve(path.dirname(file), request + '.ts')) : require(request), module, module.exports);
  return module.exports;
}
const { validatePreferences, readPreferences, rankPlaces, DEFAULT_PREFERENCES, plannerDefaults, plannerIndoorBonus } = load('src/lib/travel-preferences.ts');
const preference = { categories: ['cafe'], pacing: 'relaxed', indoorPreferred: true };
const defaults = plannerDefaults(preference);
assert.deepEqual(defaults, { tags: ['cafe'], pacing: 'relaxed', indoorPreferred: true });
defaults.tags.push('food');
assert.deepEqual(preference.categories, ['cafe']);
assert.equal(plannerIndoorBonus({ indoor: true }, true), 120);
assert.equal(plannerIndoorBonus({ indoor: 1 }, true), 120);
for (const indoor of [false, 0, null, undefined, 'false', 'true', '1']) assert.equal(plannerIndoorBonus({ indoor }, true), 0);
assert.equal(plannerIndoorBonus({ indoor: true }, false), 0);
assert.deepEqual(validatePreferences({ ...preference, categories: ['cafe', 'cafe'] }).categories, ['cafe']);
for (const value of [null, [], {}, { ...preference, categories: ['bogus'] }, { ...preference, categories: Array(11).fill('cafe') }, { ...preference, pacing: 'invalid' }, { ...preference, indoorPreferred: 'true' }, { ...preference, userId: 'other' }]) assert.throws(() => validatePreferences(value));
assert.deepEqual(readPreferences('{broken'), DEFAULT_PREFERENCES);
assert.deepEqual(readPreferences(JSON.stringify(preference)), preference);
const places = [{ id: 'popular', category: 'heritage', indoor: false, avg_visit_min: 90 }, { id: 'garden', category: 'cafe', indoor: false, avg_visit_min: 90 }, { id: 'inside', category: 'cafe', indoor: true, avg_visit_min: 45 }];
assert.deepEqual(rankPlaces(places, preference).map(place => place.id), ['inside', 'garden', 'popular']);
assert.deepEqual(rankPlaces(places, DEFAULT_PREFERENCES).map(place => place.id), ['popular', 'garden', 'inside']);
assert.equal(places[0].preference_reasons, undefined);
assert.equal(rankPlaces(places, preference).length, places.length);
assert.equal(rankPlaces([{ category: 'cafe', indoor: 'false' }], preference)[0].preference_reasons.includes('Có không gian trong nhà'), false);
assert.equal(rankPlaces([{ category: 'cafe', avg_visit_min: 0 }], preference)[0].preference_reasons.includes('Thời lượng tham quan ngắn'), false);
console.log('PASS preferences validation, safe fallback, stable ranking, explanation, immutable inputs');

if (process.env.TEST_BASE_URL) {
  const base = process.env.TEST_BASE_URL;
  const db = new (require('better-sqlite3'))('data/huevivu.db');
  const ids = [];
  const tripIds = [];
  async function request(route, token, body, method = body === undefined ? 'GET' : 'PUT') {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, headers: response.headers, body: await response.json() };
  }
  try {
    const tokens = [];
    for (let index = 0; index < 2; index++) {
      const result = await request('/api/auth/register', '', { name: 'Preferences Test', email: `preferences_${Date.now()}_${index}@example.com`, password: 'local-test-only-2026' }, 'POST');
      assert.equal(result.status, 200); ids.push(result.body.user.id); tokens.push(result.body.token);
    }
    assert.equal((await request('/api/profile/preferences')).status, 401);
    assert.equal((await request('/api/profile/preferences', '', preference)).status, 401);
    assert.equal((await request('/api/places?personalized=true')).status, 401);
    assert.deepEqual((await request('/api/profile/preferences', tokens[0])).body, DEFAULT_PREFERENCES);
    assert.equal((await request('/api/profile/preferences', tokens[0], preference)).status, 200);
    assert.deepEqual((await request('/api/profile/preferences', tokens[0])).body, preference);
    const tripInput = { duration: 1, styles: ['temple'], companion: 'solo', budget: 600000, pacing: 'packed', indoorPreferred: false, startDate: '2026-10-12' };
    const tripsBefore = db.prepare('SELECT COUNT(*) AS count FROM trips').get().count;
    for (const indoorPreferred of ['true', 1, null, {}]) assert.equal((await request('/api/trips', tokens[0], { ...tripInput, indoorPreferred }, 'POST')).status, 400);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM trips').get().count, tripsBefore);
    const override = await request('/api/trips', tokens[0], tripInput, 'POST');
    if (override.body.tripId) tripIds.push(override.body.tripId);
    assert.equal(override.status, 200);
    assert.deepEqual(override.body.trip.planning_preferences, { styles: ['temple'], pacing: 'packed', indoorPreferred: false });
    const savedTrip = JSON.parse(db.prepare('SELECT itinerary FROM trips WHERE id = ?').get(override.body.tripId).itinerary);
    assert.deepEqual(savedTrip.planning_preferences, override.body.trip.planning_preferences);
    assert.deepEqual((await request('/api/profile/preferences', tokens[0])).body, preference);
    const fromProfile = await request('/api/trips', tokens[0], { ...tripInput, styles: preference.categories, pacing: preference.pacing, indoorPreferred: preference.indoorPreferred }, 'POST');
    if (fromProfile.body.tripId) tripIds.push(fromProfile.body.tripId);
    assert.equal(fromProfile.status, 200);
    assert.deepEqual(fromProfile.body.trip.planning_preferences, { styles: ['cafe'], pacing: 'relaxed', indoorPreferred: true });
    const guest = await request('/api/trips', '', { duration: 1, styles: ['food'], companion: 'solo', budget: 300000 }, 'POST');
    if (guest.body.tripId) {
      tripIds.push(guest.body.tripId);
      ids.push(db.prepare('SELECT user_id FROM trips WHERE id = ?').get(guest.body.tripId).user_id);
    }
    assert.equal(guest.status, 200);
    assert.deepEqual(guest.body.trip.planning_preferences, { styles: ['food'], pacing: 'balanced', indoorPreferred: false });
    console.log('PASS planner API: invalid indoor values create no trip, explicit override, profile unchanged, saved snapshot, applied defaults, guest isolation');
    assert.deepEqual((await request('/api/profile/preferences', tokens[1])).body, DEFAULT_PREFERENCES);
    assert.equal((await request('/api/profile/preferences', tokens[0], { ...preference, userId: ids[1] })).status, 400);
    assert.deepEqual((await request('/api/profile/preferences', tokens[0])).body, preference);
    const publicPlaces = await request('/api/places');
    const personalized = await request('/api/places?personalized=true', tokens[0]);
    assert.deepEqual(personalized.body.map(place => place.id), rankPlaces(publicPlaces.body, preference).map(place => place.id));
    assert.equal(personalized.headers.get('cache-control'), 'private, no-store');
    const filtered = await request('/api/places?personalized=true&category=heritage', tokens[0]);
    assert.ok(filtered.body.every(place => place.category === 'heritage'));
    assert.equal((await request('/api/profile/preferences', tokens[0], DEFAULT_PREFERENCES)).status, 200);
    assert.deepEqual((await request('/api/profile/preferences', tokens[0])).body, DEFAULT_PREFERENCES);
    console.log('PASS preferences API: authorization, persistence, isolation, invalid input protection, ranking/filter/cache, reset');
  } finally {
    for (const id of tripIds) db.prepare('DELETE FROM trips WHERE id = ?').run(id);
    for (const id of ids) db.prepare('DELETE FROM users WHERE id = ?').run(id);
    db.close();
  }
}
