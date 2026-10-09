import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createServer} from '../server.mjs';

// Exercise the same proxy and normalizer as the app; export only verification metadata.
export async function checkAPI({apiKey=process.env.UW_API_KEY||'',ticker='NVDA',fetchImpl=fetch}={}){
  ticker=ticker.toUpperCase();
  if(!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker))throw new Error('Use a ticker such as NVDA.');
  const base={checkedAt:new Date().toISOString(),provider:'Unusual Whales',endpoint:'/api/option-trades/flow-alerts',ticker,verified:false,authenticated:false};
  if(!apiKey.trim())return {...base,status:'missing_key',message:'Set UW_API_KEY to the API token from your account, then retry. A checkout promo code is separate from the API token.'};
  let upstreamStatus=null;
  const server=createServer({apiKey,fetchImpl:async(...args)=>{const response=await fetchImpl(...args);upstreamStatus=response.status;return response;}});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  try{
    const response=await fetch(`http://127.0.0.1:${server.address().port}/api/flow?ticker=${encodeURIComponent(ticker)}`,{signal:AbortSignal.timeout(15000)});
    const data=await response.json();
    const authenticated=upstreamStatus>=200&&upstreamStatus<300;
    if(!response.ok)return {...base,authenticated,upstreamStatus,status:authenticated?'invalid_response':'request_failed',message:typeof data.error==='string'?data.error:'The provider request failed.'};
    const count=data.alerts.length;
    const status=count?'verified':data.rejected?'unusable_rows':'empty_sample';
    return {...base,authenticated,upstreamStatus,verified:count>0,status,normalizedAlerts:count,rejectedRows:data.rejected,duplicateRows:data.duplicates,sessionDate:data.sessionDate,
      message:count?'Authenticated alerts loaded through the app’s proxy and normalizer.':data.rejected?'The API responded, but no usable alerts survived normalization. Inspect the schema before submitting.':'The API responded with no matching usable alerts. Access responded successfully; live analysis still needs a nonempty sample.',
      evidenceScope:'Verification metadata only. No API token, alert identifiers, prices or raw response are retained.'};
  }catch{return {...base,upstreamStatus,status:'request_failed',message:'The connection check could not finish. Check network access and retry.'};}
  finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2),record=args.includes('--record'),ticker=args.find(a=>!a.startsWith('--'))||'NVDA';
    if(args.some(a=>a.startsWith('--')&&a!=='--record'))throw new Error('Usage: npm run check:api -- [TICKER] [--record]');
    const result=await checkAPI({ticker});
    console.log(JSON.stringify(result,null,2));
    if(record){await mkdir(new URL('../docs/',import.meta.url),{recursive:true});await writeFile(new URL('../docs/live-api-check.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log('Saved verification metadata to docs/live-api-check.json.');}
    process.exitCode=result.verified?0:2;
  }catch(error){console.error(error.message);process.exitCode=1;}
}
