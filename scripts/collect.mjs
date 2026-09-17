import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {collectDue} from '../lib/collectors.mjs';
import {assess} from '../lib/model.mjs';
// Respect the runtime's configured proxy. No proxy values or credentials enter the feed.
if((process.env.HTTPS_PROXY||process.env.HTTP_PROXY)&&process.allowedNodeEnvironmentFlags.has('--use-env-proxy')&&!process.execArgv.includes('--use-env-proxy')&&process.env.NODE_USE_ENV_PROXY!=='1'){
 const child=spawnSync(process.execPath,['--use-env-proxy',...process.execArgv,fileURLToPath(import.meta.url),...process.argv.slice(2)],{stdio:'inherit'});
 if(child.error)throw child.error;process.exit(child.status??1);
}
const read=async (name,fallback)=>{try{return JSON.parse(await readFile(new URL('../data/'+name,import.meta.url),'utf8'));}catch{return fallback;}};
const sources=await read('sources.json',[]), signals=await read('signals.json',[]), categories=await read('categories.json',[]);
const previous=await read('runtime/latest.json',{states:[],candidates:[],history:[]});
const force=process.argv.includes('--force');
const result=await collectDue(sources,previous.states,{limit:100,force});
const candidates=new Map(previous.candidates.map(c=>[c.id,c]));
for(const c of result.candidates)candidates.set(c.id,c);
const assessment=assess(signals,categories),day=assessment.asOf.slice(0,10);
const history=previous.history.filter(h=>h.date!==day);history.push({date:day,asOf:assessment.asOf,modelVersion:assessment.modelVersion,indicators:assessment.indicators,signals});
const payload={...result,candidates:[...candidates.values()].sort((a,b)=>b.retrievedAt.localeCompare(a.retrievedAt)).slice(0,1500),history:history.slice(-400),signals,forecasts:await read('forecasts.json',[]),hypotheses:await read('hypotheses.json',[]),citations:await read('citations.json',[]),claims:await read('ground-truth.json',[]),baselineRevision:previous.baselineRevision??'2026-09-17-v1'};
await mkdir(new URL('../data/runtime/',import.meta.url),{recursive:true});
await writeFile(new URL('../data/runtime/latest.json',import.meta.url),JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify({attempted:result.attempted,ok:result.states.filter(s=>s.status==='ok').length,candidates:payload.candidates.length,errors:result.states.filter(s=>s.status!=='ok').map(s=>({id:s.sourceId,status:s.status,error:s.error}))}));
