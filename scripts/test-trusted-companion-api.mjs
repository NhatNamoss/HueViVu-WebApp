import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), Database = require('better-sqlite3');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const db = new Database('data/huevivu.db');
const marker = `trusted_qa_${Date.now()}`, password = 'Local-qa-only-2026!';
let userId, placeId, tripId;
async function request(route, token, body, method = 'POST') {
  const res = await fetch(base + route, { method, headers: { 'Content-Type':'application/json', ...(token ? { Authorization:'Bearer ' + token } : {}) }, ...(body === undefined ? {} : { body:JSON.stringify(body) }) });
  return {status:res.status,body:await res.json()};
}
function cleanup() {
  if (tripId) { db.prepare('DELETE FROM chat_messages WHERE trip_id=?').run(tripId); db.prepare('DELETE FROM trip_state WHERE trip_id=?').run(tripId); db.prepare('DELETE FROM trips WHERE id=?').run(tripId); }
  if (placeId) { db.prepare('DELETE FROM places WHERE id=?').run(placeId); db.prepare('DELETE FROM audit_logs WHERE entity_id=?').run(placeId); }
  if (userId) db.prepare('DELETE FROM users WHERE id=?').run(userId);
}
try {
  const email = marker + '@example.com';
  const account = await request('/api/auth/register','',{name:'Trusted Companion QA',email,password});
  assert.equal(account.status,200); userId=account.body.user.id; const token=account.body.token;
  db.prepare("UPDATE users SET role='admin' WHERE id=?").run(userId);
  const weekly=Object.fromEntries(['mon','tue','wed','thu','fri','sat','sun'].map(day=>[day,[{open:'00:00',close:'23:59'}]]));
  const payload={name:marker,category:'cafe',description:'Địa điểm kiểm thử local riêng để xác minh quy trình nguồn, ngày kiểm tra và bảo vệ lịch trình.',address:'Huế',lat:16.46,lng:107.59,source_name:'Khảo sát QA local',source_url:'https://example.com',verified_by:'QA Reviewer',price:'20.000 đồng',opening_hours:weekly,indoor:true,publication_status:'published',verification_status:'verified',img:'/assets/citadel.png'};
  const invalid=await request('/api/places',token,{...payload,source_name:''}); assert.equal(invalid.status,400);
  const created=await request('/api/places',token,payload); assert.equal(created.status,201); placeId=created.body.id;
  assert.equal((await request(`/api/places/${placeId}`,token,undefined,'GET')).body.data_trust.operationalFresh,true);
  const originalDate=db.prepare('SELECT verified_at FROM places WHERE id=?').get(placeId).verified_at;
  await request(`/api/places/${placeId}`,token,{...payload,verified_at:'2099-01-01',confirm_verification:false},'PUT');
  assert.equal(db.prepare('SELECT verified_at FROM places WHERE id=?').get(placeId).verified_at,originalDate);
  await request(`/api/places/${placeId}`,token,{...payload,price:'25.000 đồng'},'PUT');
  assert.equal(db.prepare('SELECT verification_status FROM places WHERE id=?').get(placeId).verification_status,'reviewed');
  await request(`/api/places/${placeId}`,token,{...payload,confirm_verification:true},'PUT');
  const grounded=await request('/api/chat',token,{message:`Giá vé ${marker}`}); assert.equal(grounded.status,200); assert.match(grounded.body.reply,/Nguồn/);
  db.prepare('UPDATE places SET verified_at=? WHERE id=?').run('2026-01-01',placeId);
  assert.match((await request('/api/chat',token,{message:`Giá vé ${marker}`})).body.reply,/kiểm tra lại/);
  await request(`/api/places/${placeId}`,token,{...payload,confirm_verification:true},'PUT');
  await request(`/api/places/${placeId}`,token,{...payload,indoor:false,confirm_verification:false},'PUT');
  assert.equal(db.prepare('SELECT verification_status FROM places WHERE id=?').get(placeId).verification_status,'reviewed');
  await request(`/api/places/${placeId}`,token,{...payload,confirm_verification:true},'PUT');
  console.log('PASS trust API: rejects incomplete verification, preserves date, invalidates edits, rechecks, grounded fresh/stale facts');
  const generated=await request('/api/trips',token,{duration:2,styles:['cafe'],companion:'solo',budget:600000}); tripId=generated.body.tripId; assert.ok(tripId);
  const raw=db.prepare('SELECT itinerary FROM trips WHERE id=?').get(tripId).itinerary, before=JSON.parse(raw);
  await request(`/api/trips/${tripId}/state`,token,{completedActivityIndexes:[0]},'PUT');
  const proposed=structuredClone(before); proposed.days[0].activities.at(-1).time='20:00';
  const preview=await request(`/api/trips/${tripId}/customize`,token,{proposal:proposed,preview:true}); assert.equal(preview.status,200); assert.equal(db.prepare('SELECT itinerary FROM trips WHERE id=?').get(tripId).itinerary,raw);
  const appliedBody={proposal:proposed,expectedItinerary:preview.body.expectedItinerary,expectedStateUpdatedAt:preview.body.expectedStateUpdatedAt};
  assert.equal((await request(`/api/trips/${tripId}/customize`,token,{proposal:proposed})).status,400);
  await request(`/api/trips/${tripId}/state`,token,{completedActivityIndexes:[0,1]},'PUT');
  assert.equal((await request(`/api/trips/${tripId}/customize`,token,appliedBody)).status,409);
  const destructive=structuredClone(before); destructive.days[0].activities.splice(0,1);
  assert.equal((await request(`/api/trips/${tripId}/customize`,token,{proposal:destructive,preview:true})).status,422);
  const fresh=await request(`/api/trips/${tripId}/customize`,token,{proposal:proposed,preview:true});
  assert.equal((await request(`/api/trips/${tripId}/customize`,token,{proposal:proposed,expectedItinerary:fresh.body.expectedItinerary,expectedStateUpdatedAt:fresh.body.expectedStateUpdatedAt})).status,200);
  const state=(await request(`/api/trips/${tripId}/state`,token,undefined,'GET')).body.state; assert.deepEqual(state.completedActivityIndexes,[0,1]);
  assert.equal((await request(`/api/trips/${tripId}/customize`,'',{proposal:proposed})).status,401);
  console.log('PASS change API: read-only preview, mandatory snapshot, stale state conflict, completion protection and saved progress');
  const reply=await request('/api/chat',token,{tripId,message:`Dời ${before.days[0].activities[0].name} sang 09:00`,dayIndex:0}); assert.equal(reply.status,200); assert.equal(reply.body.proposal,null);
  const companion=await request('/api/companion',token,undefined,'GET'); assert.equal(companion.status,200); assert.ok(companion.body.context.nextAction.ctaHref);
  const nearby = await request('/api/companion',token,{lat:16.46,lng:107.59}); assert.equal(nearby.status,200); assert.equal(nearby.body.context.locationAvailable,true);
  assert.equal((await request('/api/companion',token,{lat:200,lng:1})).status,400);
  assert.equal((await request('/api/companion?lat=NaN&lng=1',token,undefined,'GET')).status,400);
  console.log('PASS companion API: context response and invalid-location recovery');
  if(process.env.KEEP_UI_FIXTURE==='1') { fs.writeFileSync(path.join(os.tmpdir(),'huevivu-companion-qa.json'),JSON.stringify({email,password,userId,placeId,tripId})); console.log('UI fixture retained in temporary directory for browser checks'); }
} finally { if(process.env.KEEP_UI_FIXTURE!=='1') cleanup(); db.close(); }
