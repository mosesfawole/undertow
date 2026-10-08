import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAlerts,summarize,story,counterfactual,makeBrief} from '../lib/engine.mjs';
import {demoPayload} from '../public/demo.mjs';
import {createServer} from '../server.mjs';

const fixture=()=>demoPayload('NVDA').data[0];
test('official response shape normalizes decimal strings and preserves unknowns',()=>{
 const row={...fixture(),total_premium:'186705',total_ask_side_prem:null,total_bid_side_prem:'405',open_interest:0,underlying_price:null};
 const a=normalizeAlerts({data:[row]}).alerts[0];
 assert.equal(a.premium,186705); assert.equal(a.ask,null); assert.equal(a.spot,null);assert.equal(a.volumeOi,null);assert.equal(a.sideKnown,false);
});
test('malformed rows are rejected, duplicates collapse, and order is chronological',()=>{
 const rows=demoPayload('NVDA').data;
 const result=normalizeAlerts({data:[rows[5],rows[0],rows[0],{...rows[1],created_at:'invalid'},{...rows[2],total_premium:'bad'}]});
 assert.equal(result.rejected,2);assert.equal(result.duplicates,1);assert.equal(result.alerts.length,2);assert.ok(result.alerts[0].time<result.alerts[1].time);
 assert.throws(()=>normalizeAlerts({error:'bad payload'}));
});
test('inconsistent side totals are unknown, not clamped into a bullish story',()=>{
 const a=normalizeAlerts({data:[{...fixture(),total_ask_side_prem:'200000',total_bid_side_prem:'200000'}]}).alerts[0];
 assert.equal(a.sideInconsistent,true);assert.equal(a.sideKnown,false);assert.equal(summarize([a]).label,'Unclear');
});
test('multi-leg alerts count toward total but never determine side balance',()=>{
 const a=normalizeAlerts({data:[{...fixture(),type:'call',has_multileg:true}]}).alerts[0];
 const s=summarize([a]);assert.equal(s.total,a.premium);assert.equal(s.ask,0);assert.equal(s.coverage,0);assert.equal(s.label,'Unclear');
});
test('the largest-alert stress test reverses the NVDA case without mutating evidence',()=>{
 const a=normalizeAlerts(demoPayload('NVDA')).alerts;
 const cf=counterfactual(a);
 assert.equal(cf.before.label,'Call-led');assert.equal(cf.after.label,'Put-led');assert.equal(cf.removed.premium,1800000);assert.equal(cf.changed,true);assert.equal(a.length,12);
 assert.equal(cf.before.total-cf.after.total,1800000);
});
test('a replay prefix does not narrate a later whale',()=>{
 const a=normalizeAlerts(demoPayload('NVDA')).alerts;
 const early=a.slice(0,5);assert.equal(summarize(early).label,'Put-led');assert.equal(summarize(early).largest.premium,310000);
 const text=JSON.stringify(story(early));assert.ok(!text.includes(a[5].id));
});
test('other sample cases have distinct interpretations',()=>{
 assert.equal(summarize(normalizeAlerts(demoPayload('TSLA')).alerts).label,'Put-led');
 assert.equal(summarize(normalizeAlerts(demoPayload('AAPL')).alerts).label,'Two-sided');
});
test('empty and zero-premium samples produce finite descriptive results',()=>{
 const s=summarize([]);assert.equal(s.total,0);assert.equal(s.askShare,null);assert.equal(s.label,'Unclear');assert.equal(counterfactual([]).removed,null);
 assert.match(story([]).title,/quiet/);
 const a=normalizeAlerts({data:[{...fixture(),type:'call',total_premium:0,total_ask_side_prem:0,total_bid_side_prem:0}]}).alerts;
 assert.equal(summarize(a).coverage,0);assert.ok(!JSON.stringify(story(a)).includes('NaN'));
});
test('export preserves provenance, exclusions, cutoff and demo label',()=>{
 const a=normalizeAlerts(demoPayload('NVDA')).alerts.slice(0,4);
 const text=makeBrief({ticker:'NVDA',alerts:a,mode:'demo',excludedId:'demo-NVDA-06',minPremium:250000,cutoff:a.at(-1).time});
 assert.match(text,/SYNTHETIC DEMO/);assert.match(text,/demo-NVDA-06/);assert.match(text,/\$250K/);assert.ok(text.includes(a.at(-1).at));assert.ok(text.includes(a[0].id));
});

async function withServer(options,fn){
 const server=createServer(options);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{return await fn('http://127.0.0.1:'+server.address().port);}finally{await new Promise(resolve=>server.close(resolve));}
}
test('missing key is explicit and local files are not exposed',async()=>{
 await withServer({apiKey:''},async base=>{
  const status=await (await fetch(base+'/api/status')).json();assert.equal(status.configured,false);
  const res=await fetch(base+'/api/flow?ticker=NVDA');assert.equal(res.status,503);assert.equal((await res.json()).code,'NO_API_KEY');
  for(const route of ['/server.mjs','/.env','/package.json','/lib/../server.mjs'])assert.equal((await fetch(base+route)).status,404);
  assert.equal((await fetch(base+'/')).status,200);assert.equal((await fetch(base+'/lib/engine.mjs')).status,200);
 });
});
test('API proxy uses documented filters, caches and sends the token only upstream',async()=>{
 let calls=0,received;
 await withServer({apiKey:'test-private-key',fetchImpl:async(url,options)=>{calls++;received={url,options};return new Response(JSON.stringify(demoPayload('NVDA')));}},async base=>{
  const first=await fetch(base+'/api/flow?ticker=nvda');assert.equal(first.status,200);const body=await first.text();assert.ok(!body.includes('test-private-key'));
  const result=JSON.parse(body);assert.equal(result.mode,'live');assert.equal(result.alerts.length,12);
  await fetch(base+'/api/flow?ticker=NVDA');assert.equal(calls,1);
  assert.equal(received.url.origin,'https://api.unusualwhales.com');
  assert.equal(received.url.pathname,'/api/option-trades/flow-alerts');
  assert.equal(received.url.searchParams.get('ticker_symbol'),'NVDA');
  assert.equal(received.url.searchParams.get('limit'),'200');
  assert.equal(received.options.headers.Authorization,'Bearer test-private-key');
 });
});
test('validation rejects unsafe tickers, non-GET and foreign origins',async()=>{
 await withServer({apiKey:'test'},async base=>{
  assert.equal((await fetch(base+'/api/flow?ticker='+encodeURIComponent('NVDA&url=http://bad'))).status,400);
  assert.equal((await fetch(base+'/api/status',{method:'POST'})).status,405);
  assert.equal((await fetch(base+'/api/flow?ticker=NVDA',{headers:{Origin:'https://foreign.example'}})).status,403);
 });
});
test('provider errors never fall back to sample data or expose provider bodies',async()=>{
 for(const upstreamStatus of [401,403,429,500]){
  await withServer({apiKey:'test',fetchImpl:async()=>new Response('secret error',{status:upstreamStatus})},async base=>{
   const res=await fetch(base+'/api/flow?ticker=NVDA');assert.equal(res.status,upstreamStatus===429?429:502);
   const text=await res.text();assert.ok(!text.includes('secret error'));assert.ok(!text.includes('demo-NVDA'));assert.match(text,/error/);
  });
 }
});
test('snapshot is limited to the requested ticker and latest returned date',async()=>{
 const rows=demoPayload('NVDA').data;
 await withServer({apiKey:'test',fetchImpl:async()=>new Response(JSON.stringify({data:[...rows,{...rows[0],id:'old',created_at:'2026-10-05T14:00:00Z'},{...rows[0],id:'other',ticker:'AAPL'}]}))},async base=>{
  const data=await (await fetch(base+'/api/flow?ticker=NVDA')).json();assert.equal(data.alerts.length,12);assert.equal(data.sessionDate,'2026-10-06');assert.equal(data.alerts.some(a=>a.id==='other'),false);
 });
});

