import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), ts = require('typescript'), modules = new Map();
const now = new Date('2026-10-13T07:00:00Z');
class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [now.toISOString()])); } }
let owner = 'owner', adaptations = 0;
let row = { id: 'trip', itinerary: JSON.stringify({days:[{activities:[{place_id:'out',time:'14:30',name:'Ngoài trời',type:'heritage',location:'Huế'}]},{activities:[{time:'09:00',name:'Ngày mai',type:'heritage'}]}]}), start_date:'2026-10-13',status:'active' };
let stateRow = {trip_id:'trip',day_index:0,completed_activity_indexes:'[]',started_at:'2026-10-13T01:00:00Z',fatigue:'tired',updated_at:'2026-10-13T06:00:00Z'};
let places = [{id:'out',indoor:0,weather_dependent:1}];
const db = { prepare(sql) { assert.ok(!/INSERT|UPDATE|DELETE/i.test(sql), 'assessment must not write'); return {get(...args) { if(sql.includes('FROM trips')) return args[0]==='trip' && args[1]==='owner' ? row : undefined; if(sql.includes('FROM trip_state')) return stateRow; },all() {return places;} }; } };
const mocks = { '@/lib/db':{getDb:()=>db}, '@/lib/auth':{getAuthUserId:()=>owner}, '@/lib/trip-adapter':{adaptTrip:(itinerary)=>{adaptations++;return {itinerary,changes:[]};}}, '@/lib/logger':{logger:{error(){}}} };
function load(name) {
 const file=path.resolve(name); if(modules.has(file)) return modules.get(file).exports;
 const module={exports:{}}; modules.set(file,module);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInThisContext('(function(require,module,exports,Date){'+code+'\n})',{filename:file})(request=>mocks[request] || (request.startsWith('.') ? load(path.resolve(path.dirname(file),request+'.ts')) : request.startsWith('@/') ? load('src/'+request.slice(2)+'.ts') : require(request)),module,module.exports,FixedDate);
 return module.exports;
}
const w=load('src/lib/hue-weather.ts'), {weatherImpactScope}=load('src/lib/weather-trip-impact.ts'), {normalizeTripState}=load('src/lib/trip-state.ts');
const fixture = {latitude:16.48,longitude:107.57,timezone:'Asia/Ho_Chi_Minh',utc_offset_seconds:25200,current:{time:'2026-10-13T13:45',temperature_2m:28,weather_code:61,is_day:1}};
const rain=w.normalizeHueWeather(fixture,now), hot=w.normalizeHueWeather({...fixture,current:{...fixture.current,weather_code:0,temperature_2m:37}},now);
const trip={...row,itinerary:JSON.parse(row.itinerary)}, state=normalizeTripState(stateRow,'trip',trip.itinerary.days);
const scope=weatherImpactScope(trip,state,0,rain,now); assert.ok(scope);
assert.equal(scope,weatherImpactScope(trip,state,0,{...rain,data_at:now.toISOString(),temp:29},now));
assert.notEqual(scope,weatherImpactScope(trip,state,0,hot,now));
assert.equal(weatherImpactScope(trip,state,1,rain,now),null);
assert.equal(weatherImpactScope({...trip,status:'past'},state,0,rain,now),null);
assert.equal(weatherImpactScope(trip,{...state,startedAt:null},0,rain,now),null);
assert.equal(weatherImpactScope(trip,{...state,tripId:'other'},0,rain,now),null);
assert.equal(weatherImpactScope(trip,{...state,dayProgress:{},completedActivityIndexes:[0]},0,rain,now),null);
assert.equal(weatherImpactScope(trip,state,0,{...rain,data_at:'2026-10-13T05:00:00Z'},now),null);
assert.equal(weatherImpactScope(trip,state,0,rain,new Date('2026-10-13T15:00:00Z')),null);
const {POST}=load('src/app/api/trips/[id]/replan/route.ts');
const call=async(body)=> { const res=await POST(new Request('http://localhost/api/trips/trip/replan',{method:'POST',body:JSON.stringify(body)}),{params:Promise.resolve({id:'trip'})});return {status:res.status,body:await res.json(),cache:res.headers.get('cache-control')}; };
const originalFetch=globalThis.fetch;
try {
 globalThis.fetch=async()=>new Response(JSON.stringify(fixture));
 let r=await call({dayIndex:0,trigger:'weather',assessOnly:true}); assert.equal(r.status,200);assert.equal(r.body.decision.scenario,'rain');assert.equal(adaptations,0);assert.equal(r.cache,'private, no-store');
 r=await call({dayIndex:1,trigger:'weather',assessOnly:true});assert.equal(r.body.decision.scenario,null);
 places=[{id:'out',indoor:1,weather_dependent:0}];r=await call({dayIndex:0,trigger:'weather',assessOnly:true});assert.equal(r.body.decision.scenario,null);
 places=[{id:'out',indoor:0,weather_dependent:1}];stateRow={...stateRow,completed_activity_indexes:'[0]'};r=await call({dayIndex:0,trigger:'weather',assessOnly:true});assert.equal(r.body.decision.scenario,null);
 stateRow={...stateRow,completed_activity_indexes:'[]'};
 for(const current of [{...fixture.current,time:'2020-01-01T14:00'}, {...fixture.current,weather_code:0,temperature_2m:28}]) {globalThis.fetch=async()=>new Response(JSON.stringify({...fixture,current}));r=await call({dayIndex:0,trigger:'weather',assessOnly:true});assert.equal(r.body.decision.scenario,null);}
 globalThis.fetch=async()=>{throw Error('Offline');};r=await call({dayIndex:0,trigger:'weather',assessOnly:true});assert.equal(r.body.weatherFresh,false);assert.equal(r.body.decision.scenario,null);
 globalThis.fetch=async()=>new Response(JSON.stringify({...fixture,current:{...fixture.current,weather_code:0,temperature_2m:37}}));r=await call({dayIndex:0,trigger:'weather',assessOnly:true});assert.deepEqual(r.body.decision.signals,['heat']);
 assert.equal(adaptations,0);
 r=await call({dayIndex:0,trigger:'weather'});assert.equal(adaptations,1);assert.equal(r.body.preview,true);
 row={...row,start_date:'2026-10-14'};r=await call({dayIndex:0,trigger:'weather',assessOnly:true});assert.equal(r.body.decision.scenario,null);
 owner='other';assert.equal((await call({trigger:'weather',assessOnly:true})).status,404);
 owner=null;assert.equal((await call({trigger:'weather',assessOnly:true})).status,401);
 owner='owner';assert.equal((await call({assessOnly:'yes'})).status,400);
} finally {globalThis.fetch=originalFetch;}
console.log('PASS weather trip impact: eligible days, completed/indoor exclusion, fresh rain/heat, dismissal scope, read-only assessment, preview, source failure and ownership');
