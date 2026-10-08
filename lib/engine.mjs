// Evidence-first analysis: descriptive statistics, never a prediction model.
export const number = v => v === null || v === undefined || v === '' || typeof v === 'boolean' ? null : Number.isFinite(Number(v)) ? Number(v) : null;
const nonnegative = v => { const n = number(v); return n !== null && n >= 0 ? n : null; };
export function normalizeAlerts(payload) {
  if (!payload || !Array.isArray(payload.data)) throw new Error('The API response must contain a data array.');
  const seen = new Set();
  const alerts = [];
  let rejected = 0, duplicates = 0;
  for (const raw of payload.data) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { rejected++; continue; }
    const premium = nonnegative(raw.total_premium);
    const time = Date.parse(raw.created_at);
    const ticker = String(raw.ticker ?? '').toUpperCase();
    const type = String(raw.type ?? '').toLowerCase();
    if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker) || !['call','put'].includes(type) || !Number.isFinite(time) || premium === null) { rejected++; continue; }
    const id = String(raw.id || [ticker,raw.option_chain,raw.created_at,raw.total_premium,raw.total_size,raw.alert_rule].join('|'));
    if (seen.has(id)) { duplicates++; continue; }
    seen.add(id);
    let ask = nonnegative(raw.total_ask_side_prem), bid = nonnegative(raw.total_bid_side_prem);
    const sideInconsistent = (ask !== null && ask > premium + .01) || (bid !== null && bid > premium + .01) || (ask !== null && bid !== null && ask + bid > premium + .01);
    if (sideInconsistent) { ask = null; bid = null; }
    const oi = nonnegative(raw.open_interest), volume = nonnegative(raw.volume);
    alerts.push({
      id,ticker,type,time,at:new Date(time).toISOString(),premium,ask,bid,
      sideKnown:ask !== null && bid !== null,sideInconsistent,
      strike:nonnegative(raw.strike),expiry:typeof raw.expiry === 'string' && Number.isFinite(Date.parse(raw.expiry)) ? raw.expiry.slice(0,10) : null,
      contract:String(raw.option_chain ?? ''),size:nonnegative(raw.total_size),volume,oi,
      volumeOi:oi > 0 && volume !== null ? volume/oi : null,
      spot:nonnegative(raw.underlying_price),
      sweep:raw.has_sweep === true,multileg:raw.has_multileg === true,
      opening:typeof raw.all_opening_trades === 'boolean' ? raw.all_opening_trades : null,
      rule:String(raw.alert_rule || 'Unspecified rule')
    });
  }
  return {alerts:alerts.sort((a,b)=>a.time-b.time || a.id.localeCompare(b.id)),rejected,duplicates};
}
export function summarize(alerts) {
  const total = alerts.reduce((s,a)=>s+a.premium,0);
  const known = alerts.filter(a=>a.sideKnown && !a.multileg);
  const classified = known.reduce((s,a)=>s+a.premium,0);
  const askCall = known.filter(a=>a.type==='call').reduce((s,a)=>s+a.ask,0);
  const askPut = known.filter(a=>a.type==='put').reduce((s,a)=>s+a.ask,0);
  const bid = known.reduce((s,a)=>s+a.bid,0);
  const ask = askCall+askPut;
  const largest = alerts.reduce((best,a)=>!best || a.premium>best.premium ? a : best,null);
  const skew = ask > 0 ? (askCall-askPut)/ask : null;
  const label = skew === null ? 'Unclear' : skew>.2 ? 'Call-led' : skew<-.2 ? 'Put-led' : 'Two-sided';
  return {
    count:alerts.length,total,ask,askCall,askPut,bid,classified,
    coverage:total>0?classified/total:0,
    askShare:classified>0?ask/classified:null,
    skew,label,largest,concentration:total>0?largest.premium/total:0,
    sweeps:alerts.filter(a=>a.sweep).length,
    multileg:alerts.filter(a=>a.multileg).length,
    missingSides:alerts.filter(a=>!a.sideKnown).length,
    highVolumeOi:alerts.filter(a=>a.volumeOi!==null && a.volumeOi>1).length
  };
}
export function counterfactual(alerts) {
  const before=summarize(alerts);
  const removed=before.largest;
  const after=summarize(alerts.filter(a=>a.id!==removed?.id));
  return {before,after,removed,changed:before.label!==after.label};
}
export function stressTest(alerts) {
  const baseline=summarize(alerts);
  const scenarios=alerts.map(removed=>{
    const after=summarize(alerts.filter(a=>a.id!==removed.id));
    const delta=baseline.skew===null || after.skew===null ? null : after.skew-baseline.skew;
    return {removed,after,delta,changed:baseline.label!==after.label};
  }).sort((a,b)=>Number(b.changed)-Number(a.changed) || Math.abs(b.delta??0)-Math.abs(a.delta??0) || b.removed.premium-a.removed.premium || a.removed.id.localeCompare(b.removed.id));
  return {baseline,scenarios,changes:scenarios.filter(s=>s.changed).length,
    assessable:alerts.length>=2 && baseline.skew!==null};
}
export function story(alerts) {
  const s=summarize(alerts);
  if (!s.count) return {title:'The water is quiet.',summary:'No alerts match this point in the replay. Advance the timeline or lower the premium filter.',evidence:[],alternatives:['No observations are not evidence of no activity.'],next:'Load more of the session before drawing a conclusion.'};
  const leaders=alerts.filter(a=>a.premium>0 && a.sideKnown && !a.multileg && (s.label==='Put-led'?a.type==='put':a.type==='call')).sort((a,b)=>b.ask-a.ask);
  const big=[...alerts].sort((a,b)=>b.premium-a.premium);
  const title=s.label==='Call-led'?'Call demand leads. Intent stays open.':s.label==='Put-led'?'Puts surface. Protection or conviction?':s.label==='Two-sided'?'Two currents. No simple direction.':'A large print. An incomplete picture.';
  return {
    title,
    summary:s.label==='Call-led'?'More observed ask-side premium sits in calls than puts. That describes execution, not what the trader knows or where the stock goes next.':s.label==='Put-led'?'Ask-side put premium dominates this sample. It is consistent with demand for downside exposure, but existing portfolio hedges can look the same.':s.label==='Two-sided'?'Call and put ask-side premium are close. A single bullish or bearish headline would conceal the mixed evidence.':'Too little clean, single-leg side data is available to describe the balance reliably.',
    evidence:[
      {id:big[0]?.id,label:'The anchor',text:'The largest alert accounts for '+Math.round(s.concentration*100)+'% of observed premium. Test the story without it.'},
      ...(leaders[0]?[{id:leaders[0].id,label:'The execution',text:Math.round(leaders[0].ask/leaders[0].premium*100)+'% of this '+leaders[0].type+' alert executed at the ask. Buyer initiation is plausible; opening intent is unproven.'}]:[]),
      {id:alerts.find(a=>a.volumeOi>1)?.id || big[0]?.id,label:'The missing context',text:s.highVolumeOi>0?s.highVolumeOi+' alerts have contract volume above prior-close open interest. This does not prove that every trade opened a new position.':'We do not have the trader’s portfolio or a next-day open-interest change.'}
    ],
    alternatives:s.label==='Put-led'?['Portfolio protection can create large put demand.','Closing trades or spread legs can distort a directional read.']:s.label==='Call-led'?['A hedge against a short stock position can also buy calls.','Closing trades and unobserved spread legs can resemble a new bet.']:['Offsetting positions can produce a balanced tape.','The sample may omit related trades or other expirations.'],
    next:'Check the underlying trades, other expirations and next-day open interest before treating a flow story as a thesis.'
  };
}
export const money = n => n === null || n === undefined ? '—' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(n);
export function makeBrief({ticker,alerts,mode,excludedId=null,minPremium=0,cutoff=null,fetchedAt=null,imported=false,replayStep=null}) {
  const s=summarize(alerts), narrative=story(alerts), cf=counterfactual(alerts), stress=stressTest(alerts);
  return '# UNDERTOW / '+ticker+'\n\n'+
    'Source: '+(mode==='demo'?'SYNTHETIC DEMO — fictional trades, not observed market activity.':imported?'IMPORTED API-LABELLED SAMPLE — provider origin not independently verified.':'Unusual Whales REST API — fetched sample; not a full tape.')+'\n'+
    'Exported: '+new Date().toISOString()+'\n'+
    (fetchedAt?'Fetched: '+fetchedAt+'\n':'')+
    'Filters: minimum premium '+money(minPremium)+'; replay cutoff '+(replayStep===0?'before first alert':cutoff?new Date(cutoff).toISOString():'all')+'; excluded alert '+(excludedId||'none')+'.\n\n'+
    '## '+narrative.title+'\n\n'+narrative.summary+'\n\n'+
    '- Alerts: '+s.count+'\n- Observed alert premium: '+money(s.total)+' (alerts may overlap)\n- Read: '+s.label+'\n- Single-leg side coverage: '+Math.round(s.coverage*100)+'%\n'+
    '- Largest-alert concentration: '+Math.round(s.concentration*100)+'%\n\n'+
    '## Challenge the story\n\nRemove the largest remaining alert: '+s.label+' → '+cf.after.label+'. This is a sensitivity check, not a forecast.\n\n'+
    '## Every-alert stress test\n\n'+(stress.assessable?stress.changes+' of '+stress.scenarios.length+' single-alert removals change the classification.':'Not enough usable evidence to assess stability.')+' This is not a probability or confidence score. Tests apply to the exported subset.\n\n'+
    stress.scenarios.map(x=>'- Remove '+x.removed.id+': '+s.label+' → '+x.after.label+'; balance change '+(x.delta===null?'unknown':(x.delta*100).toFixed(1)+' percentage points')+'.').join('\n')+'\n\n'+
    '## Alternative explanations\n\n'+narrative.alternatives.map(x=>'- '+x).join('\n')+'\n\n'+
    '## Evidence ledger\n\n'+alerts.map(a=>'- '+a.id+' | '+a.at+' | '+a.ticker+' '+a.type+' '+(a.strike??'?')+' | '+money(a.premium)+' | '+a.rule).join('\n')+
    '\n\nDescriptive, uncalibrated rules. No return prediction, identity inference, or trade recommendation. Ask-side is not proof of opening buying. Alerts can overlap. Research and education only.\n';
}

