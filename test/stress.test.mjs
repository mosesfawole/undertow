import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAlerts,summarize,stressTest,makeBrief} from '../lib/engine.mjs';
import {createCaseFile,readCaseFile} from '../lib/casefile.mjs';
import {demoPayload} from '../public/demo.mjs';
const sample=ticker=>normalizeAlerts(demoPayload(ticker)).alerts;

test('all-alert scan isolates the NVDA whale and applies to other sample cases',()=>{
  const scan=stressTest(sample('NVDA'));
  assert.equal(scan.assessable,true);assert.equal(scan.scenarios.length,12);assert.equal(scan.changes,2);
  assert.equal(scan.scenarios[0].removed.id,'demo-NVDA-06');assert.equal(scan.scenarios[0].after.label,'Put-led');
  assert.ok(scan.scenarios[0].delta<-.5);
  assert.equal(stressTest(sample('TSLA')).changes,0);
  // A small call removal also crosses the illustrative +20% threshold.
  assert.equal(scan.scenarios[1].removed.id,'demo-NVDA-02');assert.equal(scan.scenarios[1].after.label,'Two-sided');
  assert.ok(Math.abs(scan.scenarios[1].delta)<.04);
  assert.equal(stressTest(sample('AAPL')).changes,2);
});
test('largest premium can be less influential than a smaller single-leg alert',()=>{
  const rows=demoPayload('NVDA').data;
  const alerts=normalizeAlerts({data:[...rows,{...rows[0],id:'huge-spread',has_multileg:true,total_premium:'9000000'}]}).alerts;
  const scan=stressTest(alerts);
  assert.equal(scan.baseline.largest.id,'huge-spread');
  assert.equal(scan.scenarios[0].removed.id,'demo-NVDA-06');
  assert.equal(scan.scenarios.find(s=>s.removed.id==='huge-spread').delta,0);
});
test('stability is not asserted for empty, singleton, or unknown-side evidence',()=>{
  for (const alerts of [[],sample('NVDA').slice(0,1),sample('NVDA').map(a=>({...a,sideKnown:false,ask:null,bid:null}))]) {
    const scan=stressTest(alerts);assert.equal(scan.assessable,false);assert.ok(!JSON.stringify(scan).includes('NaN'));
  }
  assert.match(makeBrief({ticker:'NVDA',mode:'demo',alerts:[],replayStep:0}),/replay cutoff before first alert/);
});
test('replay stress test does not inspect unseen alerts or mutate its input',()=>{
  const early=sample('NVDA').slice(0,5),before=JSON.stringify(early),scan=stressTest(early);
  assert.equal(JSON.stringify(early),before);assert.equal(scan.scenarios.length,5);
  assert.ok(!JSON.stringify(scan).includes('demo-NVDA-06'));
});
test('case roundtrip preserves analysis, filter, cutoff and arbitrary excluded alert',()=>{
  const alerts=sample('NVDA'),file=createCaseFile({ticker:'NVDA',mode:'demo',alerts,minimum:250000,step:4,excluded:'demo-NVDA-03'});
  const restored=readCaseFile(JSON.parse(JSON.stringify(file)));
  assert.equal(restored.imported,true);assert.equal(restored.mode,'demo');assert.equal(restored.step,4);assert.equal(restored.minimum,250000);assert.equal(restored.excluded,'demo-NVDA-03');
  const view=restored.alerts.filter(a=>a.premium>=restored.minimum).slice(0,restored.step).filter(a=>a.id!==restored.excluded);
  const original=alerts.filter(a=>a.premium>=250000).slice(0,4).filter(a=>a.id!=='demo-NVDA-03');
  assert.deepEqual(summarize(view),summarize(original));
  assert.deepEqual(stressTest(restored.alerts),stressTest(alerts));
});
test('case export allowlists fields and imported API labels remain unverified in notes',()=>{
  const file=createCaseFile({ticker:'NVDA',mode:'live',alerts:sample('NVDA').map(a=>({...a,secret:'DO_NOT_EXPORT'})),apiKey:'DO_NOT_EXPORT',notes:['DO_NOT_EXPORT']});
  assert.ok(!JSON.stringify(file).includes('DO_NOT_EXPORT'));
  const restored=readCaseFile(file);
  assert.match(makeBrief({...restored}),/IMPORTED API-LABELLED SAMPLE/);
});
test('invalid, duplicate, oversized and inconsistent case files fail atomically',()=>{
  const base=()=>createCaseFile({ticker:'NVDA',mode:'demo',alerts:sample('NVDA')});
  const invalid=[null,{}, {...base(),version:9}];
  const badRow=base();badRow.data.push(null);invalid.push(badRow);
  const duplicate=base();duplicate.data.push(duplicate.data[0]);invalid.push(duplicate);
  const huge=base();huge.data=Array(201).fill(huge.data[0]);invalid.push(huge);
  const mixed=base();mixed.data[0].ticker='AAPL';invalid.push(mixed);
  const futureExclusion=base();futureExclusion.view.step=1;futureExclusion.view.excluded='demo-NVDA-06';invalid.push(futureExclusion);
  const futureStep=base();futureStep.view.step=999;invalid.push(futureStep);
  const longId=base();longId.data[0].id='x'.repeat(401);invalid.push(longId);
  for(const input of invalid)assert.throws(()=>readCaseFile(input),/Invalid Undertow/);
});
test('non-object provider rows are rejected without discarding valid evidence',()=>{
  const result=normalizeAlerts({data:[null,'bad',1,[],...demoPayload('NVDA').data]});
  assert.equal(result.rejected,4);assert.equal(result.alerts.length,12);
});
