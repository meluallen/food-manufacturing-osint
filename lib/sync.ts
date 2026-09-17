import {saveRecords,auditRecord} from './workspace';
import {validateFeed,validateSignal} from './validation.mjs';
import {isoDate,validPublicUrl} from './model.mjs';
export async function syncRepository(workspace:any){
 const response=await fetch('https://raw.githubusercontent.com/meluallen/food-manufacturing-osint/main/data/runtime/latest.json',{signal:AbortSignal.timeout(15000),redirect:'error',headers:{Accept:'application/json'}});
 if(!response.ok)throw Error(`Repository feed returned HTTP ${response.status}. Collection may not have run yet.`);
 const raw=await response.text();if(raw.length>8000000)throw Error('Repository feed exceeds limit');
 const feed=JSON.parse(raw),validated=validateFeed(feed,workspace),at=new Date().toISOString();
 await saveRecords('source',validated.states);await saveRecords('candidate',validated.candidates);await saveRecords('public-snapshot',validated.history);
 const citations=(Array.isArray(feed.citations)?feed.citations:[]).filter((c:any)=>typeof c.id==='string'&&typeof c.title==='string'&&validPublicUrl(c.url)&&isoDate(c.retrievedAt)&&c.retrievedAt<=at.slice(0,10));
 await saveRecords('public-citation',citations);
 const evidence={...workspace,citations:[...workspace.citations,...citations],states:[...workspace.states,...validated.states],candidates:[...workspace.candidates,...validated.candidates]};
 let skipped=0;const publicSignals=[];
 for(const s of (Array.isArray(feed.signals)?feed.signals:[]).slice(0,500)){
  try{if(s.status!=='reviewed'||!isoDate(s.reviewedAt)||s.reviewedAt>at.slice(0,10)||!isoDate(s.retrievedAt)||s.retrievedAt>at.slice(0,10)||typeof s.id!=='string'||!Number.isInteger(s.revision))throw Error('Invalid provenance');
   const validatedSignal=validateSignal(s,{...evidence,signals:[...evidence.signals,s]},new Date(),true);
   publicSignals.push({...validatedSignal,id:s.id,reviewedAt:s.reviewedAt,retrievedAt:s.retrievedAt,revision:s.revision,origin:'Reviewed public repository'});
  }catch{skipped++;}
 }
 await saveRecords('public-signal',publicSignals);
 const claims=(Array.isArray(feed.claims)?feed.claims:[]).filter((c:any)=>typeof c.id==='string'&&typeof c.statement==='string'&&typeof c.topic==='string'&&typeof c.note==='string'&&['CONFIRMED','HISTORICAL','INFERRED'].includes(c.evidenceClass)&&isoDate(c.retrievedAt)&&Array.isArray(c.sourceIds)&&c.sourceIds.length&&c.sourceIds.every((id:string)=>evidence.citations.some((v:any)=>v.id===id)));
 await saveRecords('public-claim',claims);
 const forecasts=(Array.isArray(feed.forecasts)?feed.forecasts:[]).filter((f:any)=>typeof f.id==='string'&&typeof f.question==='string'&&typeof f.resolutionRule==='string'&&typeof f.rationale==='string'&&Number.isFinite(f.probability)&&f.probability>=0&&f.probability<=1&&isoDate(f.horizon)&&isoDate(f.resolutionDue)&&Array.isArray(f.sourceIds)&&f.sourceIds.every((id:string)=>evidence.citations.some((c:any)=>c.id===id))&&(f.outcome===null||([0,1].includes(f.outcome)&&validPublicUrl(f.evidenceUrl)&&Date.parse(f.horizon+'T23:59:59Z')<Date.now()))&&(!workspace.forecasts.some((old:any)=>old.id===f.id&&old.probability!==f.probability)));
 await saveRecords('public-forecast',forecasts);
 const hypotheses=(Array.isArray(feed.hypotheses)?feed.hypotheses:[]).filter((h:any)=>typeof h.id==='string'&&['title','evidenceFor','evidenceAgainst','indicators','falsification','updatedAt'].every(k=>typeof h[k]==='string')&&['OPEN','SUPPORTED','FALSIFIED','RETIRED'].includes(h.outcome)&&Number.isFinite(h.confidence)&&h.confidence>=0&&h.confidence<=100&&Number.isInteger(h.revision)&&Number.isInteger(h.failCount)&&Array.isArray(h.sourceIds)&&h.sourceIds.every((id:string)=>evidence.citations.some((c:any)=>c.id===id)));
 await saveRecords('public-hypothesis',hypotheses);
 await saveRecords('sync',[{id:'repository',at,feedAt:feed.collectedAt,skippedSignals:skipped}]);await auditRecord('sync','repository',{feedAt:feed.collectedAt,publicAssessments:publicSignals.length,skipped});
 return {message:`Repository synchronized: ${validated.candidates.length} candidates and ${publicSignals.length} reviewed public assessments. Private reviews take precedence.${skipped?' '+skipped+' invalid assessments excluded.':''}`};
}
