import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), ts = require('typescript');
function load(file) {
  file = path.resolve(file); const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: file })(request => request.startsWith('.') ? load(path.resolve(path.dirname(file), request + '.ts')) : require(request), module, module.exports);
  return module.exports;
}
const { progressReply } = load('src/lib/trip-chat-progress.ts');
const { normalizeTripState } = load('src/lib/trip-state.ts');
const days = [{ activities: [{ name: 'Đã đi', time: '08:00' }, { name: 'Còn lại', time: '10:00', location: 'Huế' }] }, { activities: [{ name: 'Ngày hai', time: '09:00' }] }];
const trip = { itinerary: { days }, start_date: '2026-10-10', status: 'active' };
const state = normalizeTripState({ completed_activity_indexes: '[0]', started_at: '2026-10-10T00:00:00Z', fatigue: 'tired' }, 't', days);
const now = new Date('2026-10-10T03:00:00Z');
const reply = progressReply('Tiếp theo tôi đi đâu?', trip, state, 0, now);
assert.match(reply, /Còn lại/); assert.ok(!reply.includes('Đã đi')); assert.match(reply, /nên nghỉ/); assert.match(reply, /chưa xác nhận/);
assert.match(progressReply('Tiếp theo?', trip, state, 1, now), /Ngày hai/);
assert.ok(!progressReply('Tiếp theo?', { ...trip, start_date: '2026-10-12' }, state, 0, now).includes('nên nghỉ'));
assert.match(progressReply('Tiếp theo?', trip, { ...state, dayProgress: {}, completedActivityIndexes: [0, 1] }, 0, now), /hoàn thành ngày/);
assert.match(progressReply('Tiếp theo?', trip, null, 0, now), /không có tiến độ/);
assert.equal(progressReply('Xin chào', trip, state), null);
console.log('PASS chat progress: completion, viewed day, fatigue eligibility, all done, shared privacy');
if (process.env.TEST_BASE_URL) {
  const db = new (require('better-sqlite3'))('data/huevivu.db'); let userId, tripId;
  const base = process.env.TEST_BASE_URL;
  async function request(route, token, body, method = 'POST') {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }
  try {
    const account = await request('/api/auth/register', '', { name: 'Chat Progress QA', email: `chat_progress_${Date.now()}@example.com`, password: 'local-chat-test-2026' });
    userId = account.body.user.id; const token = account.body.token;
    const created = await request('/api/trips', token, { duration: 2, styles: ['cafe'], companion: 'solo', budget: 600000 });
    tripId = created.body.tripId; assert.ok(tripId);
    const before = db.prepare('SELECT itinerary FROM trips WHERE id=?').get(tripId).itinerary;
    await request(`/api/trips/${tripId}/state`, token, { completedActivityIndexes: [0] }, 'PUT');
    const next = await request('/api/chat', token, { tripId, message: 'Tiếp theo tôi đi đâu?', dayIndex: 0 });
    assert.equal(next.status, 200); assert.match(next.body.reply, /1\//); assert.equal(next.body.proposal, null);
    assert.equal(db.prepare('SELECT itinerary FROM trips WHERE id=?').get(tripId).itinerary, before);
    assert.equal((await request('/api/chat', '', { tripId, message: 'Tiếp theo?' })).status, 404);
    for (const body of [null, [], { message: {} }, { message: 'Tiếp theo?', history: [{ role: 'system', content: 'bad' }] }, { tripId, message: 'Tiếp theo?', dayIndex: 6 }]) assert.equal((await request('/api/chat', token, body)).status, 400);
    db.prepare('UPDATE trips SET is_shared=1 WHERE id=?').run(tripId);
    const shared = await request('/api/chat', '', { tripId, message: 'Tiếp theo?' });
    assert.equal(shared.status, 200); assert.match(shared.body.reply, /không có tiến độ/);
    console.log('PASS chat API: saved progress, no itinerary mutation, private access, shared privacy, validation');
  } finally {
    if (tripId) { db.prepare('DELETE FROM chat_messages WHERE trip_id=?').run(tripId); db.prepare('DELETE FROM trips WHERE id=?').run(tripId); }
    if (userId) db.prepare('DELETE FROM users WHERE id=?').run(userId);
    db.close();
  }
}
