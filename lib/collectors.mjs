/* Public collection only. Candidates never acquire reviewed status automatically. */
export const USER_AGENT='WatershedPublicIntelligence/1.0 (https://github.com/meluallen/food-manufacturing-osint)';
const MAX_BYTES=3_000_000;
const compact=s=>String(s??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const fdaDate=value=>{
  if(typeof value!=='string'||!/^\d{8}$/.test(value))return null;
  const iso=`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`;
  return Number.isFinite(Date.parse(iso))&&new Date(iso).toISOString().slice(0,10)===iso?iso:null;
};
export function parseSource(source,body,now=new Date().toISOString()) {
  const candidate=(id,title,summary,eventAt,extra={})=>({id:`${source.id}:${id}`,sourceId:source.id,title:compact(title).slice(0,240),summary:compact(summary).slice(0,850),observedAt:eventAt??null,retrievedAt:now,evidenceClass:'INFERRED',status:'candidate',category:source.category,sourceUrl:source.url,...extra});
  if(source.adapter==='nws') {
    const data=JSON.parse(body); if(!Array.isArray(data.features)) throw Error('NWS features missing');
    return data.features.map(f=>{const p=f.properties??{};return candidate(p.id??f.id,p.headline??p.event,`${p.areaDesc}: ${p.description??''}`,p.sent,{expiresAt:p.expires,severity:p.severity,geocodes:p.geocode,scope:'Regional alert. County and timing match required before facility attribution.'});}).slice(0,80);
  }
  if(source.adapter==='kev') {
    const data=JSON.parse(body);if(!Array.isArray(data.vulnerabilities))throw Error('KEV vulnerabilities missing');
    return data.vulnerabilities.filter(v=>Date.parse(now)-Date.parse(v.dateAdded)<31*86400000).slice(-60).reverse().map(v=>candidate(v.cveID,`${v.cveID} · ${v.vendorProject} ${v.product}`,`${v.shortDescription} Required action: ${v.requiredAction}`,v.dateAdded,{scope:'Inventory match required. No Watershed installed technology asserted.'}));
  }
  if(source.adapter==='fda') {
    const data=JSON.parse(body);if(!Array.isArray(data.results))throw Error('FDA results missing');
    return data.results.slice(0,60).map(v=>candidate(v.recall_number,`${v.classification}: ${v.product_description}`,`${v.recalling_firm}: ${v.reason_for_recall}. Distribution: ${v.distribution_pattern}`,fdaDate(v.report_date),{dateType:'FDA enforcement report date',recallInitiationDate:fdaDate(v.recall_initiation_date),scope:'Industry recall; report date is not recall initiation. No Watershed product/customer relationship asserted.'}));
  }
  if(source.adapter==='federal') {
    const data=JSON.parse(body);if(!Array.isArray(data.results))throw Error('Federal Register results missing');
    return data.results.slice(0,40).map(v=>candidate(v.document_number,v.title,v.abstract??v.type,v.publication_date,{sourceUrl:v.html_url??source.url,ruleStage:v.type}));
  }
  // Page changes are discovery signals. Never convert headings into measured commodity values.
  const title=compact(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]??source.name);
  return [candidate('page-change',title,'Source content changed. Open the primary source and verify release date, units, scope and materiality before assessment.',null,{scope:source.scope})];
}
async function boundedText(response) {
  const reader=response.body?.getReader(); if(!reader)return '';
  const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES){await reader.cancel();throw Error('Payload exceeds 3 MB safety limit');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return new TextDecoder().decode(bytes);
}
export async function collectOne(source, previous={},fetcher=fetch, now=new Date()) {
  const at=now.toISOString();
  if(['manual','key'].includes(source.adapter)) return {state:{sourceId:source.id,status:source.adapter,fetchedAt:at},candidates:[]};
  // Endpoints come only from the checked-in catalog; never from user or scraped inputs.
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  try {
    const response=await fetcher(source.endpoint||source.url,{signal:controller.signal,redirect:'error',headers:{'User-Agent':USER_AGENT,Accept:'application/geo+json, application/json, text/html;q=0.8',...(previous.etag?{'If-None-Match':previous.etag}:{})}});
    if(response.status===304)return {state:{...previous,sourceId:source.id,status:'ok',fetchedAt:at},candidates:[]};
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    const body=await boundedText(response);
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body)))).map(v=>v.toString(16).padStart(2,'0')).join('');
    const candidates=previous.hash===hash?[]:parseSource(source,body,at);
    return {state:{sourceId:source.id,status:'ok',fetchedAt:at,hash,etag:response.headers.get('etag'),count:candidates.length,changed:previous.hash!==hash},candidates};
  } catch(error) {
    const message=String(error.message??error).slice(0,250);
    return {state:{...previous,sourceId:source.id,status:/403|429/.test(message)?'blocked':'error',fetchedAt:at,lastSuccessAt:previous.status==='ok'?previous.fetchedAt:previous.lastSuccessAt,error:message},candidates:[]};
  } finally {clearTimeout(timer);}
}
export async function collectDue(sources,states=[],options={}) {
  const now=options.now??new Date();const byId=new Map(states.map(s=>[s.sourceId,s]));
  const due=sources.filter(s=>!['manual','key'].includes(s.adapter)&&(!byId.has(s.id)||(now-Date.parse(byId.get(s.id).fetchedAt))/3600000>=s.cadenceHours)).sort((a,b)=>a.priority-b.priority);
  const selected=due.slice(0,options.limit??80),results=[];
  for(let i=0;i<selected.length;i+=4){results.push(...await Promise.all(selected.slice(i,i+4).map(s=>collectOne(s,byId.get(s.id),options.fetcher??fetch,now))));}
  for(const r of results)byId.set(r.state.sourceId,r.state);
  return {states:[...byId.values()],candidates:results.flatMap(r=>r.candidates),attempted:selected.length,remaining:Math.max(0,due.length-selected.length),collectedAt:now.toISOString()};
}
