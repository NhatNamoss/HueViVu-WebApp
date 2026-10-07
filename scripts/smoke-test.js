const Database = require('better-sqlite3');

const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const marker = `codex_smoke_${Date.now()}`;
const db = new Database('data/huevivu.db');
let passed = 0;
let failed = 0;
const guestIds = new Set();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
async function request(path, options = {}) {
  const response = await fetch(base + path, options);
  const raw = await response.text();
  let body = raw;
  try { body = raw ? JSON.parse(raw) : null; } catch {}
  return { response, body };
}
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
}
function headers(token, json = false) {
  return { ...(json ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) };
}
function cleanup() {
  const users = [...new Set([...db.prepare('SELECT id FROM users WHERE email LIKE ? OR id LIKE ?').all(`%${marker}%`, `guest_${marker}%`).map(row => row.id), ...guestIds])];
  const trips = users.length ? db.prepare(`SELECT id FROM trips WHERE user_id IN (${users.map(() => '?').join(',')})`).all(...users).map(row => row.id) : [];
  const places = db.prepare('SELECT id FROM places WHERE name LIKE ?').all(`${marker}%`).map(row => row.id);
  const transaction = db.transaction(() => {
    for (const tripId of trips) {
      db.prepare('DELETE FROM trip_likes WHERE trip_id = ?').run(tripId);
      db.prepare('DELETE FROM trip_saves WHERE trip_id = ?').run(tripId);
      db.prepare('DELETE FROM chat_messages WHERE trip_id = ?').run(tripId);
      db.prepare('DELETE FROM journal_entries WHERE trip_id = ?').run(tripId);
      db.prepare('DELETE FROM user_events WHERE trip_id = ?').run(tripId);
      db.prepare('DELETE FROM trip_feedback WHERE trip_id = ?').run(tripId);
      db.prepare('DELETE FROM trips WHERE id = ?').run(tripId);
    }
    for (const userId of users) {
      db.prepare('DELETE FROM journal_entries WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM trip_likes WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM trip_saves WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM user_events WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM feedback WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    }
    for (const placeId of places) db.prepare('DELETE FROM audit_logs WHERE entity_id = ?').run(placeId);
    for (const userId of users) db.prepare('DELETE FROM audit_logs WHERE entity_id = ? OR actor_id = ?').run(userId, userId);
    db.prepare('DELETE FROM places WHERE name LIKE ?').run(`${marker}%`);
    db.prepare('DELETE FROM tours WHERE title = ?').run(marker);
    db.prepare('DELETE FROM training_examples WHERE context = ?').run(marker);
    db.prepare('DELETE FROM feedback WHERE message = ?').run(marker);
    db.prepare('DELETE FROM data_tasks WHERE title LIKE ? OR description LIKE ?').run(`%${marker}%`, `%${marker}%`);
    db.prepare('DELETE FROM audit_logs WHERE before_data LIKE ? OR after_data LIKE ? OR note LIKE ?').run(`%${marker}%`, `%${marker}%`, `%${marker}%`);
  });
  transaction();
}

(async () => {
  cleanup();
  let adminToken = '';
  let userToken = '';
  let guestToken = '';
  let tripId = '';
  let placeId = '';
  let tourId = '';
  let trainingId = '';
  let journalId = '';
  let roleToken = '';
  let roleUserId = '';
  let rolePlaceId = '';
  try {
    await test('essential pages, health and installation icons are reachable', async () => {
      for (const path of ['/', '/onboarding', '/flow', '/explore', '/trips', '/profile/feedback', '/profile/privacy', '/live', '/api/health', '/icon-192x192.png', '/icon-512x512.png']) {
        const result = await request(path);
        assert(result.response.status === 200, `${path}: ${result.response.status}`);
      }
      const missing = await request('/missing-smoke-page');
      assert(missing.response.status === 404 && String(missing.body).includes('Không tìm thấy trang'), 'missing page has no useful recovery');
    });
    await test('public place list and canonical categories', async () => {
      const { response, body } = await request('/api/places');
      assert(response.status === 200 && Array.isArray(body), 'place list unavailable');
      assert(body.every(place => /^[a-z_]+$/.test(place.category)), 'legacy category remains');
    });
    await test('Live Guide fallback does not pretend to recognize an image', async () => {
      const result = await request('/api/vision', { method: 'POST', headers: headers('', true), body: JSON.stringify({ image: 'data:image/jpeg;base64,AA==', mode: 'identify' }) });
      if (result.body?.source === 'catalog-fallback') {
        assert(result.response.ok && result.body.reply.includes('chưa xác định được nội dung ảnh'), 'catalog reply implies image recognition');
      } else {
        assert(result.response.status >= 400, 'configured vision service accepted an invalid image');
      }
    });
    await test('invalid place category is rejected', async () => {
      const { response } = await request('/api/places?category=not-valid'); assert(response.status === 400, `expected 400, got ${response.status}`);
    });
    await test('admin endpoints reject anonymous access', async () => {
      const checks = await Promise.all([
        request('/api/training'), request('/api/feedback'), request('/api/audit'), request('/api/admin/users'), request('/api/admin/data-quality'), request('/api/admin/data-tasks'),
        request('/api/places', { method: 'POST', headers: headers('', true), body: '{}' }),
        request('/api/tours', { method: 'POST', headers: headers('', true), body: '{}' }),
      ]);
      assert(checks.every(item => item.response.status === 401), checks.map(item => item.response.status).join(','));
    });
    await test('public demo routes cannot grant administrator access', async () => {
      for (const path of ['/api/auth/demo', '/api/auth/me']) {
        const result = await request(path, { method: 'POST' });
        assert(result.response.status === 410 && !result.body.token, `${path} still grants demo access`);
      }
      const result = await request('/api/auth/login', { method: 'POST', headers: headers('', true), body: JSON.stringify({ email: 'demo@huevivu.app', password: 'demo123' }) });
      assert(result.response.status === 401, 'known demo password still works');
    });
    await test('isolated administrator fixture', async () => {
      const result = await request('/api/auth/register', { method: 'POST', headers: headers('', true), body: JSON.stringify({ name: 'Smoke Admin', email: `${marker}_admin@example.com`, password: 'secret12' }) });
      assert(result.response.ok && result.body.token, 'fixture registration failed');
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(result.body.user.id);
      adminToken = result.body.token;
    });
    await test('registration validates and normalizes email', async () => {
      let result = await request('/api/auth/register', { method: 'POST', headers: headers('', true), body: JSON.stringify({ name: 'T', email: 'bad', password: '1' }) });
      assert(result.response.status === 400, 'invalid registration accepted');
      result = await request('/api/auth/register', { method: 'POST', headers: headers('', true), body: JSON.stringify({ name: 'Smoke User', email: `${marker.toUpperCase()}@Example.com`, password: 'secret12' }) });
      assert(result.response.ok && result.body.token, JSON.stringify(result.body)); userToken = result.body.token;
      result = await request('/api/auth/login', { method: 'POST', headers: headers('', true), body: JSON.stringify({ email: `${marker}@example.com`, password: 'secret12' }) });
      assert(result.response.ok, 'case-insensitive login failed');
    });
    await test('admin place CRUD', async () => {
      const payload = { name: marker, category: 'cafe', description: 'Địa điểm kiểm thử có mô tả đủ dài để kiểm tra toàn bộ luồng dữ liệu quản trị thủ công.', address: 'Huế', lat: 16.46, lng: 107.59, img: '/assets/citadel.png', source_name: 'Smoke test', source_url: 'https://example.com', verified_by: 'Tester', highlights: ['A'], tips: ['B'] };
      let result = await request('/api/places', { method: 'POST', headers: headers(adminToken, true), body: JSON.stringify(payload) });
      assert(result.response.status === 201, JSON.stringify(result.body)); placeId = result.body.id;
      result = await request(`/api/places/${placeId}`, { headers: headers(adminToken) }); assert(result.body.name === marker, 'place read failed');
      result = await request('/api/places'); assert(!result.body.some(place => place.id === placeId), 'draft place leaked into public list');
      result = await request('/api/places?scope=admin', { headers: headers(adminToken) }); assert(result.body.some(place => place.id === placeId), 'admin scope cannot see draft place');
      result = await request('/api/places/check-duplicates', { method: 'POST', headers: headers(adminToken, true), body: JSON.stringify(payload) }); assert(result.response.ok && result.body.duplicates.some(place => place.id === placeId), 'duplicate detector missed exact place');
      result = await request(`/api/places/${placeId}`, { method: 'PUT', headers: headers(adminToken, true), body: JSON.stringify({ ...payload, price: '10.000 VNĐ' }) });
      assert(result.response.ok, 'place update failed');
      result = await request(`/api/places/${placeId}`, { method: 'DELETE', headers: headers(userToken) });
      assert(result.response.status === 403, 'regular user deleted a place');
    });
    await test('Phase 4A coverage, import/export and data tasks', async () => {
      let result = await request('/api/admin/data-quality', { headers: headers(adminToken) });
      assert(result.response.ok && result.body.coverage.length === 10 && result.body.missing, 'coverage dashboard data unavailable');
      const importedName = `${marker}_import`;
      result = await request('/api/places/import', { method: 'POST', headers: headers(adminToken, true), body: JSON.stringify({ rows: [{ name: importedName, category: 'cafe', description: 'Dữ liệu import kiểm thử đủ dài để xác nhận validation và workflow bản nháp.', address: 'Huế', lat: '16.46', lng: '107.59', source_name: 'Smoke', source_url: 'https://example.com' }] }) });
      assert(result.response.ok && result.body.created === 1, JSON.stringify(result.body));
      const importedId = result.body.results[0].id;
      result = await request(`/api/places/${importedId}`, { headers: headers(adminToken) }); assert(result.body.publication_status === 'draft' && result.body.verification_status === 'draft', 'import bypassed review workflow');
      result = await request('/api/places/export', { headers: headers(adminToken) }); assert(result.response.ok && String(result.body).includes(importedName), 'CSV export missing imported row');
      result = await request('/api/admin/data-tasks', { method: 'POST', headers: headers(adminToken, true), body: JSON.stringify({ title: `${marker} verify task`, description: marker, priority: 'high', place_id: importedId }) }); assert(result.response.status === 201, 'task creation failed');
      const taskId = result.body.id;
      result = await request('/api/admin/data-tasks', { method: 'PUT', headers: headers(adminToken, true), body: JSON.stringify({ id: taskId, status: 'in_progress' }) }); assert(result.response.ok, 'task workflow failed');
      result = await request(`/api/places/${importedId}`, { method: 'DELETE', headers: headers(adminToken) }); assert(result.response.ok, 'imported place cleanup failed');
    });
    await test('collector-reviewer workflow, opening hours and audit log', async () => {
      let result = await request('/api/auth/register', { method: 'POST', headers: headers('', true), body: JSON.stringify({ name: 'Role Tester', email: `${marker}_role@example.com`, password: 'secret12' }) });
      assert(result.response.ok, 'role user registration failed'); roleToken = result.body.token; roleUserId = result.body.user.id;
      result = await request('/api/admin/users', { method: 'PUT', headers: headers(adminToken, true), body: JSON.stringify({ userId: roleUserId, role: 'collector' }) }); assert(result.response.ok, 'cannot assign collector');
      const weekly = Object.fromEntries(['mon','tue','wed','thu','fri','sat','sun'].map(day => [day, [{ open: '07:00', close: '23:00' }]]));
      const payload = { name: `${marker}_role_place`, category: 'cafe', description: 'Địa điểm kiểm thử workflow collector reviewer với lịch mở cửa có cấu trúc đầy đủ.', address: 'Huế', lat: 16.46, lng: 107.59, img: '/assets/citadel.png', source_name: 'Smoke', source_url: 'https://example.com', verified_by: 'Tester', verification_status: 'draft', opening_hours: weekly, highlights: ['A'], tips: ['B'] };
      result = await request('/api/places', { method: 'POST', headers: headers(roleToken, true), body: JSON.stringify(payload) }); assert(result.response.status === 201, JSON.stringify(result.body)); rolePlaceId = result.body.id;
      result = await request(`/api/places/${rolePlaceId}`, { method: 'PUT', headers: headers(roleToken, true), body: JSON.stringify({ ...payload, verification_status: 'verified' }) }); assert(result.response.status === 403, 'collector verified own data');
      result = await request('/api/admin/users', { method: 'PUT', headers: headers(adminToken, true), body: JSON.stringify({ userId: roleUserId, role: 'reviewer' }) }); assert(result.response.ok, 'cannot assign reviewer');
      result = await request(`/api/places/${rolePlaceId}`, { method: 'PUT', headers: headers(roleToken, true), body: JSON.stringify({ ...payload, verification_status: 'verified' }) }); assert(result.response.ok, JSON.stringify(result.body));
      result = await request(`/api/places/${rolePlaceId}`, { headers: headers(roleToken) }); assert(result.body.opening_hours?.mon?.length === 1 && result.body.opening_status, 'opening hours not parsed');
      result = await request('/api/audit', { headers: headers(adminToken) }); assert(result.response.ok && result.body.some(log => log.entity_id === rolePlaceId && log.action === 'verify'), 'verification audit missing');
      result = await request(`/api/places/${rolePlaceId}`, { method: 'DELETE', headers: headers(adminToken) }); assert(result.response.ok, 'role place cleanup failed'); rolePlaceId = '';
    });
    await test('guest trip is private and adaptable', async () => {
      let result = await request('/api/trips', { method: 'POST', headers: headers('', true), body: JSON.stringify({ duration: 2, styles: ['Ẩm thực'], companion: 'friends', budget: 600, food: [], sessionId: marker }) });
      assert(result.response.ok && result.body.tripId && result.body.token, JSON.stringify(result.body));
      assert(result.body.feasibility?.score >= 70, `new trip failed quality gate: ${result.body.feasibility?.score}`);
      assert(result.body.trip.days.every(day => day.activities.length <= 7), 'new trip is overloaded');
      tripId = result.body.tripId; guestToken = result.body.token;
      const identity = await request('/api/auth/me', { headers: headers(guestToken) });
      guestIds.add(identity.body.id);
      result = await request(`/api/trips/${tripId}`); assert(result.response.status === 404, 'private trip leaked');
      result = await request(`/api/trips/${tripId}`, { headers: headers(guestToken) }); assert(result.response.ok, 'owner cannot read trip');
      result = await request(`/api/trips/${tripId}/adapt`, { method: 'POST', headers: headers('', true), body: JSON.stringify({ scenario: 'late', dayIndex: 0 }) }); assert(result.response.status === 401, 'anonymous adaptation accepted');
      result = await request(`/api/trips/${tripId}/adapt`, { method: 'POST', headers: headers(guestToken, true), body: JSON.stringify({ scenario: 'late', dayIndex: 0, delayMinutes: 30, currentTime: '07:00' }) }); assert(result.response.ok, JSON.stringify(result.body));
      result = await request(`/api/trips/${tripId}/validate`, { headers: headers(guestToken) }); assert(result.response.ok && Number.isFinite(result.body.score) && Array.isArray(result.body.days), 'feasibility validation failed');
      const scoreBeforeOptimize = result.body.score;
      const beforePreview = await request(`/api/trips/${tripId}`, { headers: headers(guestToken) });
      result = await request(`/api/trips/${tripId}/optimize`, { method: 'POST', headers: headers(guestToken, true), body: JSON.stringify({ preview: true }) }); assert(result.response.ok && result.body.preview === true, 'optimization preview failed');
      const afterPreview = await request(`/api/trips/${tripId}`, { headers: headers(guestToken) });
      assert(JSON.stringify(beforePreview.body.itinerary) === JSON.stringify(afterPreview.body.itinerary), 'preview modified the saved itinerary');
      result = await request(`/api/trips/${tripId}/optimize`, { method: 'POST', headers: headers(guestToken, true) }); assert(result.response.ok && result.body.feasibility.score >= scoreBeforeOptimize, 'feasibility optimizer did not preserve or improve score');
    });
    await test('guest session replay cannot recover another identity', async () => {
      const result = await request('/api/trips', { method: 'POST', headers: headers('', true), body: JSON.stringify({ duration: 1, styles: ['Ẩm thực'], companion: 'solo', budget: 300, sessionId: marker }) });
      assert(result.response.ok && result.body.token, 'second guest trip failed');
      const identity = await request('/api/auth/me', { headers: headers(result.body.token) });
      guestIds.add(identity.body.id);
      const original = await request('/api/auth/me', { headers: headers(guestToken) });
      assert(identity.body.id !== original.body.id, 'session replay recovered first guest');
      const forbidden = await request(`/api/trips/${tripId}`, { headers: headers(result.body.token) });
      assert(forbidden.response.status === 404, 'second guest read private trip');
    });
    await test('invalid trip requests do not create records', async () => {
      const payload = { duration: 1, styles: ['Ẩm thực'], companion: 'solo', budget: 300 };
      for (const invalid of [{ duration: 0 }, { duration: 100 }, { styles: [] }, { budget: -1 }, { companion: 'invalid' }, { startDate: '2026-02-30' }, { startLat: 100, startLng: 107 }, { food: {} }]) {
        const result = await request('/api/trips', { method: 'POST', headers: headers('', true), body: JSON.stringify({ ...payload, ...invalid }) });
        assert(result.response.status === 400, `invalid request accepted: ${JSON.stringify(invalid)}`);
      }
      const expired = await request('/api/trips', { method: 'POST', headers: headers('invalid-token', true), body: JSON.stringify(payload) });
      assert(expired.response.status === 401, 'invalid token silently became a guest');
    });
    await test('adaptation preview preserves saved itinerary and detects conflicts', async () => {
      const before = await request(`/api/trips/${tripId}`, { headers: headers(guestToken) });
      const preview = await request(`/api/trips/${tripId}/adapt`, { method: 'POST', headers: headers(guestToken, true), body: JSON.stringify({ scenario: 'late', dayIndex: 0, delayMinutes: 30, currentTime: '07:00', preview: true }) });
      assert(preview.response.ok && preview.body.preview, 'adaptation preview unavailable');
      const after = await request(`/api/trips/${tripId}`, { headers: headers(guestToken) });
      assert(JSON.stringify(before.body.itinerary) === JSON.stringify(after.body.itinerary), 'preview changed saved trip');
      const conflict = await request(`/api/trips/${tripId}/adapt`, { method: 'POST', headers: headers(guestToken, true), body: JSON.stringify({ scenario: 'late', dayIndex: 0, expectedItinerary: '{}', currentTime: '07:00' }) });
      assert(conflict.response.status === 409, 'stale preview overwrote itinerary');
      const apply = await request(`/api/trips/${tripId}/adapt`, { method: 'POST', headers: headers(guestToken, true), body: JSON.stringify({ scenario: 'late', dayIndex: 0, delayMinutes: 30, currentTime: '07:00', expectedItinerary: preview.body.expectedItinerary }) });
      assert(apply.response.ok, 'confirmed adaptation failed');
      const saved = await request(`/api/trips/${tripId}`, { headers: headers(guestToken) });
      const noChange = await request(`/api/trips/${tripId}/adapt`, { method: 'POST', headers: headers(guestToken, true), body: JSON.stringify({ scenario: 'late', dayIndex: 0, delayMinutes: 30, currentTime: '23:59' }) });
      assert(noChange.response.ok && noChange.body.changed === false && noChange.body.changes.length === 0, 'finished day claimed a delay');
      const unchanged = await request(`/api/trips/${tripId}`, { headers: headers(guestToken) });
      assert(JSON.stringify(saved.body.itinerary) === JSON.stringify(unchanged.body.itinerary), 'no-op changed saved history');
    });
    await test('representative trip lengths and pacing stay usable', async () => {
      for (const [duration, pacing] of [[1, 'relaxed'], [3, 'balanced'], [5, 'relaxed'], [7, 'packed']]) {
        const result = await request('/api/trips', { method: 'POST', headers: headers('', true), body: JSON.stringify({ duration, pacing, styles: ['Ẩm thực', 'Di sản'], companion: 'family', budget: 600, startDate: '2026-10-07' }) });
        assert(result.response.ok && result.body.token, `generation failed: ${duration}/${pacing}`);
        const identity = await request('/api/auth/me', { headers: headers(result.body.token) });
        guestIds.add(identity.body.id);
        assert(result.body.trip.days.length === duration && result.body.trip.days.every(day => day.activities.length > 0), `empty or missing day: ${duration}/${pacing}`);
        assert(result.body.feasibility.score >= 70, `quality gate: ${duration}/${pacing} score=${result.body.feasibility.score}`);
        assert(result.body.trip.days.every(day => day.activities.length <= (pacing === 'relaxed' ? 7 : 9)), `overloaded: ${duration}/${pacing}`);
        const candidate = await request(`/api/trips/${result.body.tripId}/adapt`, { method: 'POST', headers: headers(result.body.token, true), body: JSON.stringify({ scenario: 'tired', dayIndex: 0, currentTime: '07:00', preview: true }) });
        assert(candidate.response.ok, 'adaptation candidate unavailable');
        for (const day of candidate.body.itinerary.days) for (const activity of day.activities) if (activity.place_id) {
          const place = db.prepare('SELECT publication_status FROM places WHERE id = ?').get(activity.place_id);
          assert(place?.publication_status === 'published', 'adaptation leaked a draft place');
        }
      }
    });
    await test('journal CRUD respects owner', async () => {
      let result = await request('/api/journal', { method: 'POST', headers: headers(userToken, true), body: JSON.stringify({ content: marker, mood: 'happy' }) });
      assert(result.response.status === 201, JSON.stringify(result.body)); journalId = result.body.id;
      result = await request(`/api/journal/${journalId}`, { method: 'PUT', headers: headers(userToken, true), body: JSON.stringify({ content: `${marker} updated`, mood: 'calm' }) }); assert(result.response.ok, 'journal update failed');
      result = await request(`/api/journal/${journalId}`, { method: 'DELETE', headers: headers(userToken) }); assert(result.response.ok, 'journal delete failed'); journalId = '';
    });
    await test('admin training CRUD', async () => {
      let result = await request('/api/training', { method: 'POST', headers: headers(adminToken, true), body: JSON.stringify({ user_profile: '{}', context: marker, output: 'ok', source: 'chatbot', reward: 1 }) });
      assert(result.response.status === 201, JSON.stringify(result.body)); trainingId = result.body.id;
      result = await request(`/api/training/${trainingId}`, { headers: headers(adminToken) }); assert(result.response.ok, 'training read failed');
      result = await request(`/api/training/${trainingId}`, { method: 'DELETE', headers: headers(adminToken) }); assert(result.response.ok, 'training delete failed'); trainingId = '';
    });
    await test('admin tour CRUD', async () => {
      let result = await request('/api/tours', { method: 'POST', headers: headers(adminToken, true), body: JSON.stringify({ title: marker, place_ids: [placeId] }) });
      assert(result.response.ok, JSON.stringify(result.body)); tourId = result.body.id;
      result = await request(`/api/tours/${tourId}`); assert(result.response.ok && result.body.places.length === 1, 'tour place resolution failed');
      result = await request(`/api/tours/${tourId}`, { method: 'DELETE', headers: headers(adminToken) }); assert(result.response.ok, 'tour delete failed'); tourId = '';
      result = await request(`/api/places/${placeId}`, { method: 'DELETE', headers: headers(adminToken) }); assert(result.response.ok, 'place delete failed'); placeId = '';
    });
    await test('feedback submission is public but listing is admin-only', async () => {
      const invalid = await request('/api/feedback', { method: 'POST', headers: headers('', true), body: JSON.stringify({ topic: 'bug', message: {}, rating: 6 }) });
      assert(invalid.response.status === 400, 'invalid feedback accepted');
      let result = await request('/api/places'); const feedbackPlaceId = result.body[0]?.id;
      result = await request('/api/feedback', { method: 'POST', headers: headers(userToken, true), body: JSON.stringify({ topic: 'content', message: marker, rating: 2, placeId: feedbackPlaceId }) }); assert(result.response.ok, 'feedback post failed');
      result = await request('/api/feedback'); assert(result.response.status === 401, 'feedback list leaked');
      result = await request('/api/feedback', { headers: headers(adminToken) }); assert(result.response.ok && result.body.feedback.some(item => item.message === marker), 'admin feedback list failed');
      result = await request('/api/admin/data-tasks?status=open', { headers: headers(adminToken) }); assert(result.response.ok && result.body.some(task => task.description === marker && task.task_type === 'user_feedback'), 'place feedback did not create a verification task');
    });
    await test('likes require auth and a shared trip', async () => {
      let result = await request('/api/feed/does-not-exist/like', { method: 'POST' }); assert(result.response.status === 401, 'anonymous like accepted');
      result = await request(`/api/feed/${tripId}/like`, { method: 'POST', headers: headers(userToken) }); assert(result.response.status === 404, 'private trip accepted a like');
      result = await request(`/api/trips/${tripId}`, { method: 'PUT', headers: headers(guestToken, true), body: JSON.stringify({ action: 'share' }) }); assert(result.response.ok, 'trip share failed');
      result = await request(`/api/feed/${tripId}/like`, { method: 'POST', headers: headers(userToken) }); assert(result.response.ok && result.body.liked === true, 'shared trip like failed');
    });
    await test('trip deletion cleans relations and preserves journal text', async () => {
      let result = await request('/api/journal', { method: 'POST', headers: headers(guestToken, true), body: JSON.stringify({ tripId, content: marker, mood: 'happy' }) });
      assert(result.response.status === 201, 'linked journal creation failed'); journalId = result.body.id;
      result = await request(`/api/trips/${tripId}`, { method: 'DELETE', headers: headers(guestToken) }); assert(result.response.ok, JSON.stringify(result.body)); tripId = '';
      result = await request('/api/journal', { headers: headers(guestToken) });
      const preserved = result.body.find(item => item.id === journalId);
      assert(preserved && preserved.trip_id === null && preserved.content === marker, 'journal was lost with trip');
    });
  } finally {
    cleanup(); db.close();
    console.log(`\nSmoke tests: ${passed} passed, ${failed} failed`);
    if (failed) process.exitCode = 1;
  }
})().catch(error => { console.error(error); try { cleanup(); } catch {} process.exit(1); });
