import {getChatGPTUser} from '@/app/chatgpt-auth';
import {baseline} from '@/lib/baseline';
import {assess,materiality,validPublicUrl} from '@/lib/model.mjs';
import {collectDue} from '@/lib/collectors.mjs';
import {loadWorkspace,saveRecords,auditRecord,recordSnapshot,atomicReview} from '@/lib/workspace';
import {validateSignal,validateFeed} from '@/lib/validation.mjs';
import {syncRepository} from '@/lib/sync';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
async function authorized(){return !!(await getChatGPTUser()) || !!(import.meta as any).env?.DEV;}
export async function GET(){
  if(!await authorized())return json({error:'Sign in with ChatGPT to open the persistent workspace.'},401);
  try{const w=await loadWorkspace();await recordSnapshot(w);return json({...w,history:[...w.history.filter((h:any)=>h.date!==w.assessment.asOf.slice(0,10)),{date:w.assessment.asOf.slice(0,10),asOf:w.assessment.asOf,indicators:w.assessment.indicators,signals:w.signals}]});}catch(e){return json({error:String((e as Error).message),...baseline,assessment:assess(baseline.signals,baseline.categories),states:[],candidates:[],history:[],persistence:'Unavailable'},503);}
}
export async function POST(request:Request){
  if(!await authorized())return json({error:'Authentication required'},401);
  const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return json({error:'Same-origin request required'},403);
  if(Number(request.headers.get('content-length')??0)>100000)return json({error:'Request too large'},413);
  try{
    const raw=await request.text();if(raw.length>100000)return json({error:'Request too large'},413);
    const body=JSON.parse(raw),workspace=await loadWorkspace(),at=new Date().toISOString();
    if(body.action==='refresh'){
      const result=await collectDue(baseline.sources,workspace.states,{limit:12});
      await saveRecords('source',result.states);await saveRecords('candidate',result.candidates);
      await auditRecord('collect','sources',{attempted:result.attempted,remaining:result.remaining});
      await recordSnapshot(workspace);
      return json({message:`Checked ${result.attempted} sources; ${result.candidates.length} candidates await review. ${result.remaining} sources remain due.`,result});
    }
    if(body.action==='sync'){
      return json(await syncRepository(workspace));
    }
    if(body.action==='hypothesis'){
      const original=workspace.hypotheses.find((h:any)=>h.id===body.id);if(!original)throw Error('Unknown hypothesis');
      if(!['OPEN','SUPPORTED','FALSIFIED','RETIRED'].includes(body.outcome)||!Number.isFinite(body.confidence)||body.confidence<0||body.confidence>100||typeof body.note!=='string'||body.note.trim().length<10)throw Error('Provide a valid confidence, outcome and review note (10+ characters).');
      if(body.revision!==original.revision)return json({error:'This hypothesis changed. Reload before saving.'},409);
      const fails=original.failCount+(body.outcome==='FALSIFIED'&&original.outcome!=='FALSIFIED'?1:0);
      const next={...original,confidence:fails>=2?Math.min(body.confidence,30):body.confidence,outcome:fails>=3?'RETIRED':body.outcome,failCount:fails,reviewNote:body.note.slice(0,4000),revision:original.revision+1,updatedAt:at};
      await atomicReview('hypothesis',original,next,'hypothesis-review');return json({message:'Hypothesis review saved with its prior version in the audit log.'});
    }
    if(body.action==='resolve'){
      const original=workspace.forecasts.find((f:any)=>f.id===body.id);if(!original)throw Error('Unknown forecast');
      if(original.outcome!==null)return json({error:'Forecast is already resolved. Preserve the original probability and outcome.'},409);
      if(new Date()<new Date(original.horizon+'T23:59:59Z'))throw Error('The measurable horizon has not arrived. Keep the forecast unresolved.');
      if(![0,1].includes(body.outcome)||!validPublicUrl(body.evidenceUrl)||typeof body.note!=='string'||body.note.length<10)throw Error('A binary outcome, public HTTPS evidence URL and resolution note are required.');
      const next={...original,outcome:body.outcome,resolvedAt:at,evidenceUrl:body.evidenceUrl,resolutionNote:body.note.slice(0,4000)};
      await atomicReview('forecast',original,next,'forecast-resolved');return json({message:'Outcome saved. Brier score now includes this forecast.'});
    }
    if(body.action==='review-signal'){
      const next=validateSignal(body.signal,workspace);const old=workspace.signals.find((v:any)=>v.id===next.id);
      if(old && body.signal.revision!==old.revision)return json({error:'Assessment changed. Reload before saving.'},409);
      await atomicReview('signal',old,next,'signal-reviewed');await recordSnapshot(await loadWorkspace());return json({message:'Assessment published. Indicators recalculated with preserved source provenance.',id:next.id});
    }
    if(body.action==='claim'){
      const c=body.claim;if(!c||typeof c.statement!=='string'||c.statement.length<15||!['CONFIRMED','HISTORICAL','INFERRED'].includes(c.evidenceClass)||!validPublicUrl(c.url)||typeof c.note!=='string'||c.note.length<10)throw Error('A statement, evidence class, public citation and limitation note are required.');
      const id=c.id&&workspace.claims.some((v:any)=>v.id===c.id)?c.id:`F-${crypto.randomUUID().slice(0,8)}`,citationId=`citation-${crypto.randomUUID().slice(0,8)}`;
      await saveRecords('citation',[{id:citationId,title:c.title??c.topic,url:c.url,kind:'Analyst-selected public source',retrievedAt:at.slice(0,10),limitation:c.note}]);
      const next={id,topic:c.topic??'Company review',statement:c.statement,evidenceClass:c.evidenceClass,sourceIds:[citationId],note:c.note,asOf:at.slice(0,10),retrievedAt:at.slice(0,10),reviewDue:new Date(Date.now()+90*86400000).toISOString().slice(0,10)};
      await atomicReview('claim',workspace.claims.find((v:any)=>v.id===id),next,'ground-truth-review');return json({message:'Ground truth claim saved with an evidence trail. Graph relationships require a separate source review.'});
    }
    return json({error:'Unknown action'},400);
  }catch(e){return json({error:String((e as Error).message)},400);}
}
