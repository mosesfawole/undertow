import test from 'node:test';
import assert from 'node:assert/strict';
import {checkAPI} from '../scripts/check-api.mjs';
import {demoPayload} from '../public/demo.mjs';

test('connection check refuses missing credentials without sending a request',async()=>{
  let calls=0;const r=await checkAPI({apiKey:'',fetchImpl:async()=>calls++});assert.equal(calls,0);assert.equal(r.verified,false);assert.equal(r.status,'missing_key');
});
test('check uses the real proxy path and retains only sanitized verification metadata',async()=>{
  let received;const r=await checkAPI({apiKey:'private-fixture-token',fetchImpl:async(url,options)=>{received={url,options};return new Response(JSON.stringify(demoPayload('NVDA')));}});
  assert.equal(r.verified,true);assert.equal(r.authenticated,true);assert.equal(r.normalizedAlerts,12);assert.equal(r.sessionDate,'2026-10-06');
  assert.equal(received.url.pathname,'/api/option-trades/flow-alerts');assert.equal(received.options.redirect,'error');assert.equal(received.options.headers.Authorization,'Bearer private-fixture-token');
  assert.doesNotMatch(JSON.stringify(r),/private-fixture-token|demo-NVDA|1800000|total_premium/);
});
test('rejected authentication never exposes upstream response text',async()=>{
  const r=await checkAPI({apiKey:'fixture',fetchImpl:async()=>new Response('private response details',{status:403})});assert.equal(r.verified,false);assert.equal(r.authenticated,false);assert.equal(r.upstreamStatus,403);assert.doesNotMatch(JSON.stringify(r),/private response details/);
});
test('an authenticated empty sample does not claim the live analysis is verified',async()=>{
  const r=await checkAPI({apiKey:'fixture',fetchImpl:async()=>new Response('{"data":[]}')});assert.equal(r.authenticated,true);assert.equal(r.verified,false);assert.equal(r.status,'empty_sample');
});
test('changed schemas and unusable rows are distinguishable from working data',async()=>{
  const a=await checkAPI({apiKey:'fixture',fetchImpl:async()=>new Response('{"different":[]}')});assert.equal(a.verified,false);assert.equal(a.status,'invalid_response');
  const b=await checkAPI({apiKey:'fixture',fetchImpl:async()=>new Response('{"data":[{"created_at":"invalid"}]}')});assert.equal(b.status,'unusable_rows');assert.equal(b.rejectedRows,1);
});
test('invalid ticker is rejected before any provider access',async()=>{
  let calls=0;await assert.rejects(()=>checkAPI({ticker:'NVDA&url=evil',apiKey:'fixture',fetchImpl:async()=>calls++}),/ticker/);assert.equal(calls,0);
});
