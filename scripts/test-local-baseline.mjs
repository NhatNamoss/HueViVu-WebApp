import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'Only run this baseline against local instances');
const times=[]; let count=0;
for(let group=0;group<6;group++) await Promise.all(Array.from({length:5},async (_,i)=>{
  const start=performance.now(); const response=await fetch(base+(i%2?'/api/health':'/api/places'),{signal:AbortSignal.timeout(10000)});
  assert.equal(response.status,200); await response.json(); times.push(performance.now()-start); count++;
}));
times.sort((a,b)=>a-b);
console.log(`PASS local baseline: ${count} read-only requests, concurrency 5, p95 ${Math.round(times[Math.ceil(times.length*.95)-1])}ms, max ${Math.round(times.at(-1))}ms`);
console.log('This is a local baseline, not a VPS/mobile-4G/load-capacity certification.');
