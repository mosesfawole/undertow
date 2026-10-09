import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {normalizeAlerts} from './lib/engine.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
export function createServer({apiKey=process.env.UW_API_KEY || '',fetchImpl=fetch,now=()=>Date.now()}={}) {
  const cache=new Map(),pending=new Map();
  const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    const host=req.headers.host || '';
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return send(res,403,{error:'Local access only.'});
    if (req.headers.origin && req.headers.origin !== 'http://'+host) return send(res,403,{error:'Cross-origin requests are not allowed.'});
    if (req.method!=='GET') return send(res,405,{error:'Only GET requests are supported.'});
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/api/status') return send(res,200,{configured:!!apiKey,provider:'Unusual Whales',cacheSeconds:60});
    if(url.pathname==='/api/flow') {
      const ticker=(url.searchParams.get('ticker') || '').toUpperCase();
      if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker)) return send(res,400,{error:'Enter a valid ticker, e.g. NVDA.'});
      if (!apiKey) return send(res,503,{error:'Live data is not connected. Add UW_API_KEY to the local .env file and restart the server.',code:'NO_API_KEY'});
      try {
        let result=cache.get(ticker);
        if(!result || now()-result.cachedAt>=60000) {
          if(!pending.has(ticker)) pending.set(ticker,(async()=>{
            const upstream=new URL('https://api.unusualwhales.com/api/option-trades/flow-alerts');
            upstream.searchParams.set('ticker_symbol',ticker);
            upstream.searchParams.set('limit','200');
            upstream.searchParams.set('min_premium','10000');
            const response=await fetchImpl(upstream,{redirect:'error',headers:{Authorization:'Bearer '+apiKey,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
            if(!response.ok) {
              const e=new Error(response.status===401 || response.status===403?'The API rejected access. Check your key, plan and endpoint permissions.':response.status===429?'Unusual Whales rate limit reached. Wait before retrying.':'The data provider is temporarily unavailable.');
              e.status=response.status===429?429:502; throw e;
            }
            const body=await response.json();
            const normalized=normalizeAlerts(body);
            const selected=normalized.alerts.filter(a=>a.ticker===ticker);
            const latestDay=selected.length?selected.at(-1).at.slice(0,10):null;
            const value={...normalized,alerts:selected.filter(a=>a.at.slice(0,10)===latestDay),sessionDate:latestDay,mode:'live',ticker,fetchedAt:new Date(now()).toISOString(),cachedAt:now(),sampleLimit:200,window:'Latest returned UTC date; partial alert sample, not full tape.'};
            if(cache.size>=30) cache.delete(cache.keys().next().value);
            cache.set(ticker,value);
            return value;
          })().finally(()=>pending.delete(ticker)));
          result=await pending.get(ticker);
        }
        const {cachedAt,...publicResult}=result;
        return send(res,200,{...publicResult,cached:now()>cachedAt});
      } catch(e) { return send(res,e.status || 502,{error:e.name==='TimeoutError'?'The provider timed out. Please retry.':e.status?e.message:'Could not read the provider response. No demo data has been substituted.'}); }
    }
    if(url.pathname.startsWith('/api/')) return send(res,404,{error:'Endpoint not found.'});
    try {
      const route=decodeURIComponent(url.pathname);
      const allowedLib=['/lib/engine.mjs','/lib/casefile.mjs'].includes(route);
      const relative=route==='/'?'index.html':route.replace(/^\//,'');
      const publicRoot=path.resolve(root,'public');
      const file=allowedLib?path.resolve(root,relative):path.resolve(publicRoot,relative);
      if(!allowedLib && (!file.startsWith(publicRoot+path.sep) || relative.split(/[\\/]/).some(x=>x.startsWith('.')))) return send(res,404,{error:'Not found.'});
      const data=await readFile(file);
      res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'});
      res.end(data);
    } catch {send(res,404,{error:'Not found.'});}
  });
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT || 4173);
  createServer().listen(port,'127.0.0.1',()=>console.log('Undertow is ready at http://127.0.0.1:'+port));
}
