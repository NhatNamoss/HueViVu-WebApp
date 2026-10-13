import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), ts = require('typescript'), modules = new Map();
function load(name) {
  const file = path.resolve(name); if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} }; modules.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: file })(request => request.startsWith('.') ? load(path.resolve(path.dirname(file), request + '.ts')) : request.startsWith('@/') ? load('src/' + request.slice(2) + '.ts') : require(request), module, module.exports);
  return module.exports;
}
const weather = load('src/lib/hue-weather.ts');
const { companionAction } = load('src/lib/companion-action.ts');
const { detectReplanNeed } = load('src/lib/dynamic-replanning.ts');
const now = new Date('2026-10-12T03:30:00Z');
const fixture = { latitude: 16.48, longitude: 107.57, timezone: 'Asia/Ho_Chi_Minh', utc_offset_seconds: 25200,
  current: { time: '2026-10-12T10:15', temperature_2m: 28, apparent_temperature: 30, relative_humidity_2m: 80, wind_speed_10m: 5, weather_code: 61, is_day: 1 },
  daily: { time: ['2026-10-12', '2026-10-13', '2026-10-14'], temperature_2m_max: [30, 31, 32], temperature_2m_min: [23, 24, 25], weather_code: [61, 3, 0] } };
const fresh = weather.normalizeHueWeather(fixture, now);
assert.equal(fresh.data_at, '2026-10-12T03:15:00.000Z');
assert.equal(fresh.updated_at, fresh.data_at);
assert.notEqual(fresh.fetched_at, fresh.data_at);
assert.equal(fresh.location.name, 'Thành phố Huế');
assert.equal(fresh.condition, 'rainy');
assert.equal(weather.isWeatherUsable(fresh, now), true);
assert.equal(fresh.forecast[1].day, 'Ngày mai');
const old = weather.normalizeHueWeather({ ...fixture, current: { ...fixture.current, time: '2026-10-12T09:29' } }, now);
assert.equal(old.freshness, 'stale'); assert.equal(old._fallback, true); assert.equal(old.forecast.length, 0);
assert.equal(weather.isWeatherUsable(old, now), false);
assert.equal(weather.isWeatherUsable(fresh, new Date('2026-10-12T04:16:00Z')), false);
assert.equal(weather.weatherFreshness('2026-10-12T02:30:00Z', now), 'fresh');
assert.equal(weather.weatherFreshness('2026-10-12T03:36:00Z', now), 'unknown');
for (const time of [null, 'bad', '2026-02-30T10:15', '2026-10-12T25:00']) {
  const unknown = weather.normalizeHueWeather({ ...fixture, current: { ...fixture.current, time } }, now);
  assert.equal(unknown.freshness, 'unknown'); assert.equal(unknown._fallback, true);
}
for (const temperature_2m of [null, NaN, '', 100]) {
  assert.equal(weather.normalizeHueWeather({ ...fixture, current: { ...fixture.current, temperature_2m } }, now).freshness, 'unavailable');
}
assert.equal(weather.normalizeHueWeather({ ...fixture, latitude: 21 }, now).freshness, 'unavailable');
assert.equal(weather.normalizeHueWeather({ ...fixture, timezone: 'UTC' }, now).freshness, 'unavailable');
assert.equal(weather.normalizeHueWeather({ ...fixture, current: { ...fixture.current, weather_code: 999 } }, now)._fallback, true);
const atMidnight = weather.normalizeHueWeather({ ...fixture, current: { ...fixture.current, time: '2026-10-13T00:00' } }, new Date('2026-10-12T17:10:00Z'));
assert.equal(atMidnight.forecast[0].date, '2026-10-13'); assert.equal(atMidnight.forecast[0].day, 'Hôm nay');
const contextWeather = data => weather.isWeatherUsable(data, now) ? { condition: data.condition, temp: data.temp } : null;
assert.equal(companionAction({ now, weather: contextWeather(fresh) }, []).weatherRisk, 'rain');
assert.equal(companionAction({ now, weather: contextWeather(old) }, []).weatherRisk, 'none');
const trip = { now, startDate: '2026-10-12', duration: 1, dayIndex: 0, status: 'active', startedAt: now.toISOString(), activities: [{ time: '11:00', type: 'heritage' }] };
assert.equal(detectReplanNeed({ ...trip, weather: contextWeather(fresh) }).scenario, 'rain');
assert.notEqual(detectReplanNeed({ ...trip, weather: contextWeather(old) }).scenario, 'rain');
const { GET } = load('src/app/api/weather/route.ts');
const { getHueClock } = load('src/lib/travel-clock.ts');
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => new Response(JSON.stringify({ ...fixture, current: { ...fixture.current, time: getHueClock().date + 'T' + getHueClock().time } }));
  const response = await GET();
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).freshness, 'fresh');
  globalThis.fetch = async () => new Response(JSON.stringify({ ...fixture, current: { ...fixture.current, time: '2020-01-01T12:00' } }));
  assert.equal((await (await GET()).json()).freshness, 'stale');
  globalThis.fetch = async (url, options) => { assert.equal(url, weather.HUE_WEATHER_URL); assert.equal(options.cache, 'no-store'); throw new Error('Offline'); };
  assert.equal((await weather.fetchHueWeather()).freshness, 'unavailable');
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  assert.equal((await weather.fetchHueWeather()).freshness, 'unavailable');
} finally { globalThis.fetch = originalFetch; }
console.log('Weather freshness, Huế location, midnight, invalid data, context/replan and provider failures: passed');
