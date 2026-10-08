import {normalizeAlerts} from './engine.mjs';

export const CASE_VERSION=1;
// Only documented observation fields leave the browser. No environment, keys or notes.
const toRaw=a=>({id:a.id,ticker:a.ticker,type:a.type,created_at:a.at,total_premium:a.premium,
  total_ask_side_prem:a.sideInconsistent?null:a.ask,total_bid_side_prem:a.sideInconsistent?null:a.bid,
  strike:a.strike,expiry:a.expiry,option_chain:a.contract,total_size:a.size,volume:a.volume,
  open_interest:a.oi,underlying_price:a.spot,has_sweep:a.sweep,has_multileg:a.multileg,
  all_opening_trades:a.opening,alert_rule:a.rule});

export function createCaseFile({ticker,mode,alerts,minimum=0,step,excluded=null,fetchedAt=null}) {
  return {format:'undertow-case',version:CASE_VERSION,createdAt:new Date().toISOString(),
    source:{kind:mode==='demo'?'synthetic':'uw-api',ticker,fetchedAt},
    view:{minimum,step:step??alerts.filter(a=>a.premium>=minimum).length,excluded},
    data:alerts.map(toRaw)};
}

export function readCaseFile(input) {
  const fail=()=>{throw new Error('Invalid Undertow case file. Export a fresh .json case from Undertow.');};
  if (!input || input.format!=='undertow-case' || input.version!==CASE_VERSION ||
      !['synthetic','uw-api'].includes(input.source?.kind) ||
      typeof input.source.ticker!=='string' || !/^[A-Z][A-Z0-9.\-]{0,9}$/.test(input.source.ticker) ||
      !Array.isArray(input.data) || input.data.length>200) fail();
  const textFields=['id','ticker','type','created_at','expiry','option_chain','alert_rule'];
  for (const row of input.data) {
    if (!row || typeof row!=='object' || Array.isArray(row)) fail();
    if (textFields.some(k=>row[k]!=null && (typeof row[k]!=='string' || row[k].length>400))) fail();
  }
  const {alerts,rejected,duplicates}=normalizeAlerts(input);
  if (rejected || duplicates || alerts.some(a=>a.ticker!==input.source.ticker)) fail();
  const view=input.view;
  if (!view || ![0,250000,500000,1000000].includes(view.minimum) ||
      !Number.isInteger(view.step) || view.step<0 ||
      view.step>alerts.filter(a=>a.premium>=view.minimum).length) fail();
  const visible=alerts.filter(a=>a.premium>=view.minimum).slice(0,view.step);
  if (view.excluded!==null && (typeof view.excluded!=='string' || !visible.some(a=>a.id===view.excluded))) fail();
  const fetchedAt=input.source.fetchedAt;
  if (fetchedAt!==null && (typeof fetchedAt!=='string' || !Number.isFinite(Date.parse(fetchedAt)))) fail();
  return {ticker:input.source.ticker,mode:input.source.kind==='synthetic'?'demo':'live',alerts,
    minimum:view.minimum,step:view.step,excluded:view.excluded,fetchedAt,imported:true,
    sessionDate:alerts.at(-1)?.at.slice(0,10)??null};
}
