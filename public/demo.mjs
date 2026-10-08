// Entirely fabricated fixture; real tickers do not make these real trades.
const templates={
  NVDA:{name:'NVIDIA',title:'The whale in the room.',subtitle:'One oversized call. A much less obvious story.',spot:184,
    events:[[5,'put',175000,.81,180],[19,'call',235000,.64,195],[34,'put',280000,.89,175],[49,'call',195000,.72,190],[64,'put',310000,.9,180],[90,'call',1800000,.96,200],[107,'put',210000,.76,175],[128,'call',130000,.58,195],[150,'put',340000,.92,170],[168,'call',190000,.61,190],[188,'put',290000,.84,180],[210,'call',150000,.62,200]]},
  TSLA:{name:'Tesla',title:'A little protection. Or a lot of doubt.',subtitle:'Put demand has two sides. Find what the tape can actually prove.',spot:326,
    events:[[6,'call',180000,.64,340],[24,'put',460000,.94,310],[44,'put',260000,.81,300],[67,'call',240000,.65,350],[86,'put',830000,.91,300],[104,'put',350000,.87,315],[128,'call',140000,.72,345],[143,'put',390000,.93,305],[161,'put',240000,.84,300],[181,'call',200000,.73,335],[198,'put',320000,.94,310],[217,'call',130000,.61,350]]},
  AAPL:{name:'Apple',title:'Two currents. One ticker.',subtitle:'The most honest answer is sometimes an unresolved one.',spot:237,
    events:[[4,'call',230000,.91,245],[20,'put',200000,.88,230],[40,'call',350000,.92,250],[60,'put',410000,.93,225],[80,'call',290000,.84,245],[100,'put',340000,.91,230],[120,'call',240000,.82,250],[142,'put',330000,.85,220],[158,'call',310000,.92,245],[177,'put',230000,.8,225],[195,'call',280000,.86,250],[215,'put',270000,.9,230]]}
};
export const cases=Object.entries(templates).map(([ticker,t])=>({ticker,name:t.name,title:t.title,subtitle:t.subtitle}));
export function demoPayload(ticker='NVDA') {
  const t=templates[ticker] || templates.NVDA;
  return {data:t.events.map(([minute,type,premium,askShare,strike],i)=>({
    id:'demo-'+ticker+'-'+String(i+1).padStart(2,'0'),ticker,type,
    created_at:new Date(Date.UTC(2026,9,6,13,30)+minute*60000).toISOString(),
    expiry:'2026-11-20T00:00:00Z',strike:String(strike),
    option_chain:ticker+'261120'+(type==='call'?'C':'P')+String(strike*1000).padStart(8,'0'),
    total_premium:String(premium),total_ask_side_prem:String(Math.round(premium*askShare)),
    total_bid_side_prem:String(Math.round(premium*(1-askShare)*.7)),
    total_size:Math.round(premium/420),volume:Math.max(900+i*390,Math.round(premium/420)+600),open_interest:1300+(i%3)*350,
    has_sweep:[1,4,5,8,10].includes(i),has_multileg:i===7,has_singleleg:i!==7,
    all_opening_trades:i===5,underlying_price:String(t.spot),
    alert_rule:i===5?'RepeatedHitsAscendingFill':i%3===0?'RepeatedHitsDescendingFill':'RepeatedHits'
  }))};
}

