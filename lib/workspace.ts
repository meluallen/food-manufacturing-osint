import {env} from 'cloudflare:workers';
import {baseline} from './baseline';
import {assess} from './model.mjs';
import initialRuntime from '@/data/runtime/latest.json';
type RecordValue=Record<string,any>;
export function database(){const db=(env as any).DB as D1Database|undefined;if(!db)throw Error('Persistent database is unavailable');return db;}
export async function saveRecords(kind:string,values:RecordValue[]){
  const db=database(),at=new Date().toISOString();
  for(let i=0;i<values.length;i+=50)await db.batch(values.slice(i,i+50).map(v=>db.prepare('INSERT INTO records (id,kind,payload,updated_at,revision) VALUES (?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at,revision=records.revision+1').bind(`${kind}:${v.id??v.sourceId??v.date}`,kind,JSON.stringify(v),at)));
}
export async function auditRecord(action:string,id:string,payload:unknown){await database().prepare('INSERT INTO audit (id,action,record_id,at,payload) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),action,id,new Date().toISOString(),JSON.stringify(payload)).run();}
export async function atomicReview(kind:string,original:any,next:any,action:string){
 const db=database(),id=`${kind}:${next.id}`,at=new Date().toISOString(),revision=(original ? (original.revision??1) : 0)+1;next={...next,revision};
 const statements=[];
 if(original){statements.push(db.prepare('INSERT OR IGNORE INTO records (id,kind,payload,updated_at,revision) VALUES (?,?,?,?,?)').bind(id,kind,JSON.stringify(original),at,original.revision??1));
 const predicate=kind==='forecast'?"json_extract(payload,'$.outcome') IS NULL":"COALESCE(json_extract(payload,'$.revision'),1)=?";
 const update=db.prepare(`UPDATE records SET payload=?,updated_at=?,revision=revision+1 WHERE id=? AND ${predicate}`);statements.push(kind==='forecast'?update.bind(JSON.stringify(next),at,id):update.bind(JSON.stringify(next),at,id,original.revision??1));
 }else statements.push(db.prepare('INSERT OR IGNORE INTO records (id,kind,payload,updated_at,revision) VALUES (?,?,?,?,1)').bind(id,kind,JSON.stringify(next),at));
 statements.push(db.prepare('INSERT INTO audit (id,action,record_id,at,payload) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),action,next.id,at,JSON.stringify({before:original??null,after:next})));
 const result=await db.batch(statements);if(result[original?1:0].meta.changes!==1)throw Error('This record changed in another session. Reload before saving.');return next;
}
export async function loadWorkspace(){
  const db=database();const batches=await db.batch([
   db.prepare("SELECT kind,payload FROM records WHERE kind IN ('signal','claim','citation','hypothesis','forecast','source','sync','public-signal','public-citation','public-claim','public-hypothesis','public-forecast')"),
   db.prepare("SELECT kind,payload FROM records WHERE kind='candidate' ORDER BY updated_at DESC LIMIT 1500"),
   db.prepare("SELECT kind,payload FROM records WHERE kind='snapshot' ORDER BY updated_at DESC LIMIT 400"),
   db.prepare("SELECT kind,payload FROM records WHERE kind='public-snapshot' ORDER BY updated_at DESC LIMIT 400")]);
  const groups:Record<string,any[]>={};for(const batch of batches)for(const row of batch.results){const r=row as {kind:string,payload:string};(groups[r.kind]??=[]).push(JSON.parse(r.payload));}
  const merge=(kind:string,seed:any[])=>[...new Map([...seed,...(groups[kind]??[])].map(v=>[v.id,v])).values()];
  const signals=merge('signal',merge('public-signal',baseline.signals));
  const citations=merge('citation',merge('public-citation',baseline.citations)),knownSources=new Set([...citations,...baseline.sources].map(c=>c.id));
  const assessment=assess(signals,baseline.categories,new Date(),knownSources);
  const states=[...new Map([...initialRuntime.states,...(groups.source??[])].map(s=>[s.sourceId,s])).values()];
  const candidates=merge('candidate',initialRuntime.candidates);
  return {...baseline,signals,claims:merge('claim',merge('public-claim',baseline.claims)),citations,hypotheses:merge('hypothesis',merge('public-hypothesis',baseline.hypotheses)),forecasts:merge('forecast',merge('public-forecast',baseline.forecasts)),states,candidates,history:(groups.snapshot??[]).sort((a,b)=>a.date.localeCompare(b.date)),publicHistory:(groups['public-snapshot']??initialRuntime.history??[]).sort((a,b)=>a.date.localeCompare(b.date)),assessment,sync:groups.sync?.[0]??null,persistence:'Connected'};
}
export async function recordSnapshot(workspace:any){
  const a=workspace.assessment;
  await saveRecords('snapshot',[{date:a.asOf.slice(0,10),asOf:a.asOf,modelVersion:a.modelVersion,indicators:a.indicators,signals:workspace.signals}]);
}
