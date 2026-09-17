import {FACTORS,IMPACT_DOMAINS,ROLES,isoDate,materiality,validPublicUrl} from './model.mjs';
export function validateSignal(s,workspace,now=new Date(),allowExpired=false){
 if(!s||!workspace.categories.includes(s.category)||!['Threat','Opportunity','Mixed'].includes(s.direction)||!['Confirmed','High','Medium','Low','Speculative'].includes(s.confidence)||!['Immediate','Near','Tactical','Strategic'].includes(s.timeToImpact)||!['CONFIRMED','HISTORICAL','INFERRED'].includes(s.evidenceClass))throw Error('Invalid category, direction, confidence, horizon or evidence class.');
 if(materiality(s.factors).score===null||Object.keys(s.factors).some(k=>!FACTORS.includes(k)))throw Error('Exactly seven finite 0–100 factors are required.');
 for(const key of ['title','summary','causalPath','factorRationale','verify','action','trigger'])if(typeof s[key]!=='string'||s[key].trim().length<8||s[key].length>5000)throw Error(`Substantive ${key} required (8–5,000 characters).`);
 if(!Array.isArray(s.roles)||!s.roles.length||s.roles.some(r=>!ROLES.includes(r)))throw Error('Select at least one valid decision owner.');
 if(!Array.isArray(s.impactDomains)||!s.impactDomains.length||s.impactDomains.some(r=>!IMPACT_DOMAINS.includes(r)))throw Error('Select at least one valid impact domain.');
 if(s.facilityIds&&(!Array.isArray(s.facilityIds)||s.facilityIds.some(id=>!workspace.facilities.some(f=>f.id===id))))throw Error('Unknown facility.');
 const old=workspace.signals.find(v=>v.id===s.id);
 if((s.observedAt!==null||!old||old.observedAt!==null)&&(!isoDate(s.observedAt)||new Date(s.observedAt)>now))throw Error('Use a real observation date, no later than today.');
 if(!isoDate(s.expiresAt)||(!allowExpired&&new Date(s.expiresAt+'T23:59:59Z')<now))throw Error('Use a valid current/future assessment expiry.');
 if(!Array.isArray(s.sourceIds)||!s.sourceIds.length||s.sourceIds.length>15)throw Error('One or more reviewed source references are required.');
 const times=s.sourceIds.map(id=>{const citation=workspace.citations.find(c=>c.id===id&&c.retrievedAt);const candidate=workspace.candidates?.find(c=>c.sourceId===id&&c.retrievedAt);const state=workspace.states?.find(c=>c.sourceId===id&&c.status==='ok');const at=citation?.retrievedAt??candidate?.retrievedAt??state?.fetchedAt;if(!at||!Number.isFinite(Date.parse(at)))throw Error(`Source ${id} has no verified retrieval. Collect or add a sourced claim first.`);return at;});
 let urgentOverride=null;if(s.urgentOverride){if(!['High','Critical'].includes(s.urgentOverride.level)||typeof s.urgentOverride.reason!=='string'||s.urgentOverride.reason.trim().length<20||s.direction==='Opportunity')throw Error('Urgent escalation needs a threat/mixed assessment and a specific verified rationale.');urgentOverride={level:s.urgentOverride.level,reason:s.urgentOverride.reason.slice(0,3000)};}
 const assessmentId=old?.id??`A-${crypto.randomUUID().slice(0,8)}`;
 return Object.fromEntries([...['title','summary','category','direction','confidence','evidenceClass','timeToImpact','sourceIds','factors','factorRationale','causalPath','verify','action','trigger','observedAt','expiresAt','roles','impactDomains'].map(k=>[k,s[k]]),['id',assessmentId],['facilityIds',s.facilityIds??[]],['group',typeof s.group==='string'?s.group.slice(0,100):assessmentId],['retrievedAt',old?.retrievedAt??times.sort()[0].slice(0,10)],['reviewedAt',now.toISOString().slice(0,10)],['status','reviewed'],['revision',(old?.revision??0)+1],['urgentOverride',urgentOverride]]);
}
export function validateFeed(feed,workspace){
 if(!feed||!Array.isArray(feed.states)||!Array.isArray(feed.candidates)||!Array.isArray(feed.history)||!Number.isFinite(Date.parse(feed.collectedAt)))throw Error('Invalid repository feed.');
 const known=new Set(workspace.sources.map(s=>s.id));
 const states=feed.states.filter(s=>known.has(s.sourceId)&&['ok','error','blocked'].includes(s.status)&&Number.isFinite(Date.parse(s.fetchedAt))&&Date.parse(s.fetchedAt)<=Date.now()+60000&&(!workspace.states.find(v=>v.sourceId===s.sourceId)||s.fetchedAt>workspace.states.find(v=>v.sourceId===s.sourceId).fetchedAt)).slice(0,200);
 const candidates=feed.candidates.filter(c=>known.has(c.sourceId)&&typeof c.id==='string'&&c.id.length<300&&typeof c.title==='string'&&c.title.length<=500&&typeof c.summary==='string'&&c.summary.length<=1500&&Number.isFinite(Date.parse(c.retrievedAt))&&validPublicUrl(c.sourceUrl)).slice(0,1500).map(c=>({...c,status:'candidate',evidenceClass:'INFERRED'}));
 const history=feed.history.filter(h=>isoDate(h.date)&&h.date<new Date().toISOString().slice(0,10)&&Array.isArray(h.indicators)&&h.indicators.length===workspace.categories.length&&workspace.categories.every(category=>h.indicators.filter(i=>i.category===category&&(i.score===null||Number.isFinite(i.score)&&i.score>=0&&i.score<=100)).length===1)&&Array.isArray(h.signals)).slice(-400).map(h=>({...h,origin:'Public repository baseline'}));
 return {states,candidates,history};
}
