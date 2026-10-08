import {normalizeAlerts,summarize,story,counterfactual,stressTest,money,makeBrief} from '/lib/engine.mjs';
import {createCaseFile,readCaseFile} from '/lib/casefile.mjs';
import {cases,demoPayload} from './demo.mjs';
const $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=t=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false}).format(t);
const percent=n=>n===null?'—':Math.round(n*100)+'%';
const storageKey='undertow-notebook-v1';
const balance=n=>n===null?'Unknown':(n>0?'+':'')+(n*100).toFixed(2)+'%';
function caseDownload(){
  if(state.caseUrl)URL.revokeObjectURL(state.caseUrl);
  state.caseUrl=URL.createObjectURL(new Blob([JSON.stringify(createCaseFile(state),null,2)],{type:'application/json'}));
  $('download-case').href=state.caseUrl;
  $('download-case').download='undertow-'+state.ticker.toLowerCase()+'-'+state.mode+'-case.json';
}
function applyScenario(id){
  if(id && !revealed().some(a=>a.id===id))return;
  stop();state.excluded=id;render();
  if($('stress-dialog').open)$('stress-dialog').close();
  toast(id?'Alert excluded. Map, story and ledger recalculated.':'All revealed evidence restored.');
}
function renderStress(){
  const report=stressTest(revealed()),excluded=revealed().find(a=>a.id===state.excluded);
  const headline=!report.assessable?'More evidence needed':report.changes?'The story is sensitive.':'The label survives each test.';
  $('stress-summary').innerHTML='<div class="stress-verdict"><span class="stress-orbit '+(report.assessable&&report.changes?'sensitive':'')+'">'+(report.assessable?report.changes:'—')+'</span><div><strong>'+headline+'</strong><p>'+(report.assessable?report.changes+' of '+report.scenarios.length+' single-alert removals change the '+report.baseline.label.toLowerCase()+' classification.':'Reveal at least two alerts and usable side data to test stability.')+'</p></div></div><div class="stress-baseline"><small>FULL REVEALED SAMPLE</small><strong>'+report.baseline.label+'</strong><span>Ask-side balance '+balance(report.baseline.skew)+'</span></div>';
  $('open-stress').disabled=!report.scenarios.length;
  $('stress-active').hidden=!excluded;
  $('stress-active').innerHTML=excluded?'<span>EXCLUDED · '+money(excluded.premium)+' '+excluded.type+' at '+time(excluded.time)+' ET → <strong>'+summarize(current()).label+'</strong></span><button id="restore-evidence">Restore evidence ↶</button>':'';
}
function showStress(){
  const report=stressTest(revealed());
  $('stress-results').innerHTML='<div class="stress-baseline-strip"><span>Baseline: <strong>'+report.baseline.label+'</strong></span><span>Balance: '+balance(report.baseline.skew)+'</span></div>'+report.scenarios.map((s,i)=>'<article class="stress-row '+(s.changed?'changes':'')+'"><div class="stress-rank">'+String(i+1).padStart(2,'0')+'</div><div class="stress-observation"><strong>'+money(s.removed.premium)+' '+s.removed.type+'</strong><small>'+time(s.removed.time)+' ET · '+escape(s.removed.strike??'?')+' strike</small><button class="text-link" data-stress-inspect="'+escape(s.removed.id)+'">Inspect source ↗</button></div><div class="stress-result"><strong>'+s.after.label+'</strong><small>Balance '+balance(s.after.skew)+'</small><small>Shift '+(s.delta===null?'unknown':(s.delta>0?'+':'')+(s.delta*100).toFixed(1)+' pp')+'</small><span>'+(!report.assessable?'Insufficient evidence':s.changed?'Classification changes':'Label unchanged')+'</span></div><button class="button small" data-scenario="'+escape(s.removed.id)+'" aria-label="Remove '+money(s.removed.premium)+' '+s.removed.type+' at '+time(s.removed.time)+'">Apply ↗</button></article>').join('');
  $('stress-dialog').showModal();
}
let notes=[];try{notes=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(notes))notes=[];notes=notes.filter(n=>n && n.alert && typeof n.alert.ticker==='string' && Number.isFinite(n.alert.time));}catch{notes=[];}
const state={ticker:'NVDA',mode:'demo',alerts:[],step:12,minimum:0,excluded:null,playing:false,timer:null,view:'session',busy:false,requestId:0,fetchedAt:null,sessionDate:'2026-10-06',configured:false,detail:null,imported:false};
function filtered(){return state.alerts.filter(a=>a.premium>=state.minimum);}
function revealed(){return filtered().slice(0,state.step);}
function current(){return revealed().filter(a=>a.id!==state.excluded);}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),3200);}
function saveNotes(){try{localStorage.setItem(storageKey,JSON.stringify(notes));}catch{toast('Browser storage is unavailable. Notes will last for this visit only.');}$('note-count').textContent=notes.length;}
function stop(){clearInterval(state.timer);state.timer=null;state.playing=false;$('play').textContent='▶';$('play').setAttribute('aria-label','Play session replay');}
function setView(view){state.view=view;stop();for(const name of ['session','notebook','guide'])$(name+'-view').hidden=name!==view;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('crumb').textContent={session:'Observation deck',notebook:'Field notebook',guide:'Field guide'}[view];$('export-top').disabled=view!=='session';if(view==='notebook')renderNotebook();if(view==='guide')renderGuide();window.scrollTo({top:0,behavior:'instant'});}
function loadDemo(ticker){state.requestId++;state.busy=false;stop();state.ticker=ticker;state.mode='demo';state.imported=false;state.alerts=normalizeAlerts(demoPayload(ticker)).alerts;state.minimum=0;state.step=state.alerts.length;state.excluded=null;state.sessionDate='2026-10-06';state.fetchedAt=null;$('minimum').value='0';$('request-state').hidden=true;setView('session');render();$('refresh').disabled=false;}
function render(){
  const c=cases.find(c=>c.ticker===state.ticker), a=current(),s=summarize(a), all=filtered(), r=revealed(), cf=counterfactual(r);
  $('case-list').innerHTML=cases.map(c=>'<button class="case-button '+(state.mode==='demo'&&c.ticker===state.ticker?'selected':'')+'" data-ticker="'+c.ticker+'" aria-pressed="'+(state.mode==='demo'&&c.ticker===state.ticker)+'"><span class="case-symbol">'+c.ticker[0]+'</span><span class="case-info"><strong>'+c.ticker+'</strong><small>'+({NVDA:'The oversized call',TSLA:'Protection or doubt',AAPL:'The mixed message'}[c.ticker])+'</small></span><span class="case-dot"></span></button>').join('');
  $('case-title').textContent=state.mode==='demo'?(c?.title||'A saved synthetic investigation.'):'Follow the '+state.ticker+' current.';
  $('case-subtitle').textContent=state.mode==='demo'?(c?.subtitle||'Reopened evidence. The same questions, preserved.'):'A recent alert sample. Every inference tied to its evidence.';
  $('edition-number').textContent=state.imported?'FILE':state.mode==='demo'?String(cases.indexOf(c)+1).padStart(3,'0'):'LIVE';
  $('ticker-name').textContent=state.ticker;$('company-name').textContent=c?.name||'Custom ticker';$('ticker-logo').textContent=state.ticker[0];
  $('session-date').textContent=(state.sessionDate?new Date(state.sessionDate+'T12:00:00Z').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).toUpperCase():'NO ALERTS')+' · TIMES ET';
  $('source-badge').innerHTML='<i></i> '+(state.imported?'IMPORTED CASE':state.mode==='demo'?'DEMO WATERS':'API SNAPSHOT');
  $('source-badge').classList.toggle('connected',state.mode==='live');
  $('sample-banner').innerHTML=state.mode==='demo'?'<span>◈</span><p><strong>An illustrative session.</strong> These trades are fictional. The evidence engine is real.</p><button id="sample-info">How it works <span>↗</span></button>':'<span>◈</span><p><strong>Unusual Whales API snapshot.</strong> Latest returned UTC date; up to 200 alerts above $10k. Fetched '+(state.fetchedAt?escape(time(Date.parse(state.fetchedAt))):'unknown time')+' ET. Not a full tape or a streaming feed.</p>';
  if(state.imported)$('sample-banner').innerHTML='<span>◈</span><p><strong>Imported '+(state.mode==='demo'?'synthetic case':'API-labelled case')+'.</strong> Source labels are claims from the file; provider origin is not verified. '+(state.mode==='demo'?'These trades are fictional.':'Keep licensed observations private.')+'</p>';
  renderStress();
  $('stats').innerHTML=[
    ['Observed premium',money(s.total),'across '+s.count+' alerts · may overlap'],
    ['Ask-side share',percent(s.askShare),'known-side, single-leg alerts only'],
    ['The current read',s.label,'descriptive · not a forecast'],
    ['Data coverage',percent(s.coverage),'premium with usable single-leg side data']
  ].map(([label,value,detail])=>'<div class="stat"><div class="stat-label">'+label+'</div><div class="stat-value">'+value+'</div><div class="stat-detail">'+detail+'</div></div>').join('');
  $('replay').max=all.length;$('replay').value=state.step;$('replay').disabled=all.length===0;
  $('replay-time').textContent=r.length?time(r.at(-1).time)+' ET':'Before first alert';
  $('replay-count').textContent=state.step+' of '+all.length+' alerts revealed';
  $('play').disabled=!all.length;$('restart').disabled=!all.length;
  renderChart(all,r);
  $('evidence-total').textContent=a.length+' ALERT'+(a.length===1?'':'S');
  $('evidence-body').innerHTML=a.length?[...a].reverse().map(e=>'<tr><td>'+time(e.time)+'</td><td><span class="contract-pill '+(e.type==='put'?'put':'')+'">'+escape(e.strike??'?')+' '+(e.type==='call'?'C':'P')+'</span></td><td>'+money(e.premium)+'</td><td><span class="ask-cell"><span class="ask-meter"><span style="width:'+(e.sideKnown&&e.premium>0?Math.round(e.ask/e.premium*100):0)+'%"></span></span>'+(e.sideKnown&&e.premium>0?percent(e.ask/e.premium):'—')+'</span></td><td><button class="trace-button" data-alert="'+escape(e.id)+'" aria-label="Inspect '+escape(e.ticker)+' '+escape(e.type)+' alert at '+time(e.time)+'">↗</button></td></tr>').join(''):'<tr><td colspan="5" class="no-results">No alerts at this point. Advance replay or lower the filter.</td></tr>';
  const narrative=story(a);$('story-title').textContent=narrative.title;$('story-summary').textContent=narrative.summary;
  $('story-evidence').innerHTML=narrative.evidence.map((e,i)=>'<button class="evidence-link" data-alert="'+escape(e.id)+'"><span>0'+(i+1)+'</span><div><strong>'+e.label+'</strong><p>'+escape(e.text)+'</p></div><b>↗</b></button>').join('');
  $('alternative').textContent=narrative.alternatives[0];
  $('counterfactual').innerHTML='<div class="counter-pair '+(cf.changed?'changed':'')+'"><span>'+cf.before.label+'</span><b>→</b><span>'+cf.after.label+'</span></div>';
  $('challenge').innerHTML=(state.excluded?'Restore excluded alert':'Remove the biggest alert')+' <span>'+(state.excluded?'↶':'↗')+'</span>';
  $('challenge').classList.toggle('is-active',!!state.excluded);$('challenge').setAttribute('aria-pressed',String(!!state.excluded));$('challenge').disabled=!r.length;
  $('export-top').disabled=state.view!=='session';
}
function renderChart(all,r){
  const w=650,h=220,lo=all[0]?.time??0,hi=all.at(-1)?.time??1,duration=Math.max(1,hi-lo),max=Math.max(...all.map(a=>a.premium),1);
  let svg='<svg viewBox="0 0 '+w+' '+h+'" role="group" aria-label="Options-flow evidence map. Horizontal position is time, vertical position is ask share, circle area is premium."><defs><radialGradient id="sea"><stop stop-color="#326b54" stop-opacity=".27"/><stop offset="1" stop-color="#19483f" stop-opacity="0"/></radialGradient><linearGradient id="fade"><stop stop-color="#9bb878" stop-opacity=".04"/><stop offset=".5" stop-color="#9bb878" stop-opacity=".15"/><stop offset="1" stop-color="#9bb878" stop-opacity=".04"/></linearGradient></defs><ellipse cx="330" cy="95" rx="265" ry="120" fill="url(#sea)"/>';
  for(let i=0;i<9;i++)svg+='<path d="M-10 '+(30+i*19)+' C110 '+(-15+i*22)+',160 '+(90+i*13)+',280 '+(52+i*15)+' S480 '+(5+i*21)+',680 '+(45+i*18)+'" fill="none" stroke="url(#fade)" stroke-width="1"/>';
  for(let i=0;i<6;i++){const x=25+i*120;svg+='<line x1="'+x+'" y1="16" x2="'+x+'" y2="180" stroke="#54785e" stroke-opacity=".15" stroke-dasharray="2 6"/><text x="'+x+'" y="207" fill="#74957b" font-size="8" text-anchor="middle">'+(all.length?time(lo+duration*i/5):'—')+'</text>';}
  svg+='<line x1="20" y1="181" x2="630" y2="181" stroke="#54785e" stroke-opacity=".2"/><text x="629" y="17" text-anchor="end" fill="#759882" font-size="7">ASK-SIDE SHARE ↕</text>';
  const anchor=summarize(r).largest;
  for(const a of r){
    const x=25+(a.time-lo)/duration*590,share=a.sideKnown&&a.premium>0?a.ask/a.premium:null;
    const y=share===null?165:35+(1-share)*140,radius=Math.max(3,Math.sqrt(a.premium/max)*29);
    const col=share===null?'#a7b4ae':a.type==='call'?'#d2e79a':'#e7a38a', excluded=a.id===state.excluded;
    svg+='<g class="flow-point" tabindex="0" role="button" data-alert="'+escape(a.id)+'" aria-label="Inspect '+escape(a.ticker)+' '+a.type+' '+money(a.premium)+' at '+time(a.time)+'" opacity="'+(excluded?'.2':'1')+'"><title>'+escape(a.type.toUpperCase()+' · '+money(a.premium)+' · '+time(a.time)+' ET'+(excluded?' · excluded':''))+'</title><line x1="'+x+'" y1="'+(y+radius+3)+'" x2="'+x+'" y2="180" stroke="'+col+'" stroke-opacity=".13"/><circle cx="'+x+'" cy="'+y+'" r="'+(radius+6)+'" fill="none" stroke="'+col+'" stroke-opacity=".12"/><circle cx="'+x+'" cy="'+y+'" r="'+radius+'" fill="'+col+'" fill-opacity="'+(a.type==='call'?'.22':'.11')+'" stroke="'+col+'" stroke-width="1" stroke-opacity=".8"/><circle cx="'+x+'" cy="'+y+'" r="2" fill="'+col+'"/>';
    if(share===null)svg+='<text x="'+x+'" y="'+(y+4)+'" fill="#eef2dd" font-size="12" text-anchor="middle">?</text>';
    if(a.id===anchor?.id)svg+='<text x="'+Math.min(585,Math.max(70,x))+'" y="'+Math.min(138,y+radius+22)+'" fill="#e0e8be" font-size="11" text-anchor="middle" letter-spacing=".5">'+money(a.premium)+'</text><text x="'+Math.min(585,Math.max(70,x))+'" y="'+Math.min(151,y+radius+34)+'" fill="#8aa78c" font-size="6" text-anchor="middle" letter-spacing="1.3">LARGEST ALERT</text>';
    svg+='</g>';
  }
  if(!r.length)svg+='<text x="325" y="100" fill="#b5c8a3" font-size="13" text-anchor="middle">A quiet beginning. Press play to follow the evidence.</text>';
  svg+='</svg>';$('flow-chart').innerHTML=svg;
}
function showDetail(id){
  const a=state.alerts.find(a=>a.id===id);if(!a)return;state.detail=a;
  const pinned=notes.some(n=>n.alert?.id===id&&n.mode===state.mode);
  $('detail-content').innerHTML='<button class="dialog-close" data-close="detail-dialog" aria-label="Close alert detail">×</button><span class="eyebrow">EVIDENCE / '+(state.imported?(state.mode==='demo'?'IMPORTED FICTIONAL SAMPLE':'IMPORTED API CLAIM · UNVERIFIED'):state.mode==='demo'?'FICTIONAL SAMPLE':'UNUSUAL WHALES API')+'</span><h2 id="detail-title">'+escape(a.ticker)+' · '+escape(a.strike??'?')+' '+a.type+'</h2><div class="detail-premium">'+money(a.premium)+'</div><p>Observed alert premium · '+time(a.time)+' ET · '+a.at.slice(0,10)+'</p><div class="detail-grid">'+[
    ['Ask-side share',a.sideKnown&&a.premium?percent(a.ask/a.premium):'Unknown'],['Expiration',a.expiry||'Unknown'],['Contracts',a.size??'Unknown'],['Sweep',a.sweep?'Flagged':'Not flagged'],['Multi-leg',a.multileg?'Flagged — excluded from side read':'Not flagged'],['Volume / OI',a.volumeOi===null?'Unknown':a.volumeOi.toFixed(2)+'×'],['Prior-close OI',a.oi??'Unknown'],['Contract volume',a.volume??'Unknown'],['Opening flag',a.opening===true?'API flag: true':a.opening===false?'API flag: false':'Unknown']
  ].map(([k,v])=>'<div><small>'+k+'</small><strong>'+escape(v)+'</strong></div>').join('')+'</div><p class="detail-warning">'+(a.multileg?'This alert is flagged as multi-leg. Its premium is shown, but it is excluded from the call/put side analysis because an individual leg can misrepresent the strategy.':a.sideInconsistent?'The provider returned inconsistent side totals. These fields are treated as unknown rather than forced into a signal.':'Ask-side execution is consistent with buyer initiation. It does not reveal the trader’s identity, portfolio, opening intent or future returns.')+'</p><div class="detail-actions"><button class="button primary" id="pin-alert">'+(pinned?'Pinned to notebook ✓':'Pin to field notebook +')+'</button><a class="text-link" href="https://api.unusualwhales.com/docs/api/option-trade/flow-alerts" target="_blank" rel="noreferrer">Field definitions ↗</a></div><p class="detail-source">RULE: '+escape(a.rule)+'<br>ALERT ID: '+escape(a.id)+'<br>CONTRACT: '+escape(a.contract)+'</p>';
  if(!$('detail-dialog').open)$('detail-dialog').showModal();
}
function renderNotebook(){
  $('notebook-list').innerHTML=notes.length?notes.map((n,i)=>'<article class="note-card"><span class="eyebrow">'+escape(n.imported?'IMPORTED CASE · UNVERIFIED':n.mode==='demo'?'FICTIONAL SAMPLE':'API SNAPSHOT')+' / '+escape(n.saved?.slice(0,10))+'</span><h2>'+escape(n.alert.ticker)+' · '+money(n.alert.premium)+' '+escape(n.alert.type)+' alert</h2><p>'+escape(time(n.alert.time))+' ET · '+escape(n.alert.expiry||'Unknown expiry')+' · '+escape(n.alert.rule)+'</p><textarea aria-label="Your note for '+escape(n.alert.ticker)+' alert '+(i+1)+'" data-note="'+i+'" placeholder="What do you see? What would change your mind?">'+escape(n.text||'')+'</textarea><div class="note-actions"><button class="text-link" data-delete-note="'+i+'">Remove note</button><button class="button small" data-save-note="'+i+'">Save note ✓</button></div></article>').join(''):'<div class="empty-notebook"><span>▤</span><h2>Leave a trail of evidence.</h2><p>Inspect an alert on the observation deck and pin it here. Add the questions you want to revisit.</p><button class="button" data-view="session">Back to the observation deck ↗</button></div>';
}
function renderGuide(){
  const guides=[
    ['01','A print is not a prediction.','An options-flow alert is an aggregation of trades that matched a rule. It can represent urgency, a hedge, a closing position, or one part of a much bigger trade. Undertow describes the sample. It does not predict price.'],
    ['02','At the ask ≠ an opening bet.','Ask-side executions are consistent with buyer initiation. The buyer may be closing a short option or hedging another position. A call purchase is not automatically bullish conviction. The same caution applies to puts.'],
    ['03','The map has a legend.','Each circle is an alert. Move left to right through time; higher circles have a higher ask-side share. The central circle area roughly scales with premium. Lime means calls; coral means puts. There is no stock-price line on this map.'],
    ['04','Challenge your first reading.','The largest-alert test removes one observation and recalculates every statistic and the story. If the label flips, your reading depends heavily on that print. Stability still does not validate a trade thesis.'],
    ['05','The rule, in plain sight.','We use known-side alerts that are not flagged multi-leg. Call-led means (ask-call premium − ask-put premium) / total ask premium > 0.20. Put-led means < −0.20. In between is two-sided. These thresholds are illustrative heuristics, not trained or calibrated probabilities.'],
    ['06','Know what is missing.','Data coverage is the share of observed alert premium with both side totals present and no multi-leg flag. Missing values stay unknown. Volume/OI uses prior-close open interest; zero OI gives an undefined ratio. Multiple alerts can overlap, so summed alert premium is not necessarily unique dollars traded.'],
    ['07','A sample, with boundaries.','Live mode requests up to 200 alerts with minimum premium $10,000, then retains the latest returned UTC date. It does not paginate the whole tape. A 60-second server cache limits repeat requests. API errors never silently switch to demo data. Use the refresh button for a new snapshot.'],
    ['09','Every alert gets its turn.','The Story Stress Lab removes each revealed alert in turn, ranks changes in the classification and balance, and lets you apply any scenario. It uses the full revealed sample as its baseline even while one alert is excluded. A stable label is not proof of a stable thesis: thresholds are arbitrary and related alerts may overlap.'],
    ['10','Carry the investigation with you.','Save a .json case alongside your Markdown note. Reopening restores the observations, filter, replay position and excluded alert. Files are processed locally in your browser. Imported source labels are unverified claims; an API label does not authenticate market data. Keep licensed API case files private.'],
    ['08','Build a reproducible field note.','Export records the source, fetch time, replay cutoff, premium filter, excluded alert, working story and evidence IDs. Demo fixtures are fictional and explicitly marked. Live API access needs your own key and plan. Public demos should stay on synthetic data unless redistribution is licensed.']
  ];
  $('guide-content').innerHTML=guides.map(([n,title,body])=>'<article class="guide-card"><span>'+n+' / FIELD GUIDE</span><h2>'+title+'</h2><p>'+body+'</p></article>').join('')+'<article class="guide-card wide"><span>THE SOURCE</span><h2>Built on Unusual Whales.</h2><p>Uses the documented Flow Alerts endpoint, bearer authentication and official response fields. The narratives are deterministic and evidence-linked; no LLM key is required.</p><br><a class="text-link" href="https://api.unusualwhales.com/docs/api/option-trade/flow-alerts" target="_blank" rel="noreferrer">Read the official API documentation ↗</a></article>';
}
async function checkConnection(){try{const res=await fetch('/api/status');if(!res.ok)throw new Error();const data=await res.json();state.configured=data.configured;$('connection-status').innerHTML='<div class="connection-state">'+(data.configured?'● A server key is configured. Load a ticker to verify provider access.':'○ Demo mode ready. No API key is configured.')+'</div>';return data.configured;}catch{$('connection-status').innerHTML='<div class="connection-state">Cannot reach the local server. Restart npm start.</div>';return false;}}
async function loadLive(ticker){
  const request=++state.requestId;stop();state.busy=true;$('refresh').disabled=true;$('load-live').disabled=true;$('connect-error').textContent='Loading your alert sample…';
  try{
    const res=await fetch('/api/flow?ticker='+encodeURIComponent(ticker));const data=await res.json();if(!res.ok)throw new Error(data.error||'Could not load data.');if(request!==state.requestId)return;
    state.ticker=ticker;state.mode='live';state.imported=false;state.alerts=data.alerts;state.step=data.alerts.length;state.minimum=0;state.excluded=null;state.fetchedAt=data.fetchedAt;state.sessionDate=data.sessionDate;$('minimum').value='0';$('request-state').hidden=true;
    if($('connect-dialog').open)$('connect-dialog').close();setView('session');render();toast(data.alerts.length?'Loaded '+data.alerts.length+' real alerts.':'The API returned no matching alerts. No sample data was substituted.');
  }catch(e){if(request!==state.requestId)return;$('connect-error').textContent=e.message;$('request-state').textContent=e.message+' Your current session is unchanged.';$('request-state').hidden=false;}
  finally{if(request===state.requestId){state.busy=false;$('refresh').disabled=false;}$('load-live').disabled=false;}
}
document.addEventListener('click',async event=>{
  const b=event.target.closest('button,a,[role="button"]');if(!b)return;
  if(b.dataset.close){$(b.dataset.close).close();return;}
  if(b.dataset.view){setView(b.dataset.view);return;}
  if(b.dataset.ticker){loadDemo(b.dataset.ticker);return;}
  if(b.dataset.alert){showDetail(b.dataset.alert);return;}
  if(b.dataset.scenario){applyScenario(b.dataset.scenario);return;}
  if(b.dataset.stressInspect){$('stress-dialog').close();showDetail(b.dataset.stressInspect);return;}
  if(b.dataset.deleteNote!==undefined){notes.splice(Number(b.dataset.deleteNote),1);saveNotes();renderNotebook();toast('Note removed.');return;}
  if(b.dataset.saveNote!==undefined){const i=Number(b.dataset.saveNote);notes[i].text=document.querySelector('[data-note="'+i+'"]').value.slice(0,5000);saveNotes();toast('Field note saved on this device.');return;}
  switch(b.id){
    case 'open-stress':stop();showStress();break;
    case 'restore-evidence':applyScenario(null);break;
    case 'open-import':$('import-error').textContent='';$('case-file').value='';$('import-dialog').showModal();break;
    case 'play':if(state.playing){stop();break;}if(state.step>=filtered().length){state.step=0;state.excluded=null;}state.playing=true;$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','Pause session replay');render();state.timer=setInterval(()=>{state.step=Math.min(state.step+1,filtered().length);render();if(state.step>=filtered().length)stop();},1050);break;
    case 'restart':stop();state.step=0;state.excluded=null;render();break;
    case 'challenge':applyScenario(state.excluded?null:summarize(revealed()).largest?.id);break;
    case 'pin-alert':if(!state.detail)break;if(notes.some(n=>n.alert?.id===state.detail.id&&n.mode===state.mode)){toast('This alert is already in your notebook.');break;}notes.unshift({alert:state.detail,mode:state.mode,imported:state.imported,text:'',saved:new Date().toISOString()});saveNotes();b.textContent='Pinned to notebook ✓';toast('Pinned. Open the field notebook to add your questions.');break;
    case 'methodology':case 'sample-info':setView('guide');break;
    case 'source-badge':case 'connect-side':await checkConnection();$('connect-error').textContent='';$('connect-dialog').showModal();break;
    case 'check-connection':await checkConnection();break;
    case 'refresh':if(state.imported){stop();state.step=filtered().length;state.excluded=null;render();toast('Saved case replay reset.');}else if(state.mode==='demo'){loadDemo(state.ticker);toast('Illustrative session reset.');}else await loadLive(state.ticker);break;
    case 'export-top':{
      const content=makeBrief({ticker:state.ticker,alerts:current(),mode:state.mode,excludedId:state.excluded,minPremium:state.minimum,cutoff:revealed().at(-1)?.time,fetchedAt:state.fetchedAt,imported:state.imported,replayStep:state.step});
      caseDownload();
      if(state.exportUrl)URL.revokeObjectURL(state.exportUrl);
      state.exportUrl=URL.createObjectURL(new Blob([content],{type:'text/markdown;charset=utf-8'}));
      $('export-preview').value=content;$('download-note').href=state.exportUrl;
      $('download-note').download='undertow-'+state.ticker.toLowerCase()+'-'+state.mode+'-field-note.md';
      $('export-dialog').showModal();break;}
    case 'copy-note':try{await navigator.clipboard.writeText($('export-preview').value);toast('Field note copied.');}catch{$('export-preview').focus();$('export-preview').select();toast('Select and copy the field note above.');}break;
  }
});
document.addEventListener('keydown',e=>{if(e.target.matches('.flow-point')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showDetail(e.target.dataset.alert);}});
$('replay').addEventListener('input',e=>{stop();state.step=Number(e.target.value);if(!revealed().some(a=>a.id===state.excluded))state.excluded=null;render();});
$('minimum').addEventListener('change',e=>{stop();state.minimum=Number(e.target.value);state.step=filtered().length;state.excluded=null;render();});
$('live-form').addEventListener('submit',e=>{e.preventDefault();const ticker=$('live-ticker').value.trim().toUpperCase();if(!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker)){$('connect-error').textContent='Enter a valid ticker, such as NVDA.';return;}loadLive(ticker);});
for(const id of ['detail-dialog','connect-dialog','export-dialog','stress-dialog','import-dialog'])$(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close();}});
$('case-file').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  const request=++state.requestId;
  try{
    if(file.size>2_000_000)throw new Error('Case files must be smaller than 2 MB.');
    const restored=readCaseFile(JSON.parse(await file.text()));
    if(request!==state.requestId)return;
    stop();Object.assign(state,restored,{busy:false});$('minimum').value=String(state.minimum);
    $('refresh').disabled=false;$('load-live').disabled=false;$('request-state').hidden=true;
    $('import-dialog').close();setView('session');render();toast('Saved investigation reopened. Source labels are unverified.');
  }catch(e){$('import-error').textContent=e instanceof SyntaxError?'This file is not valid JSON.':e.message;}
});
saveNotes();loadDemo('NVDA');

