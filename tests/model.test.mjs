import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assess,materiality,eligible,failureCorrelation,calibration,yesterdaySnapshot,personas,isoDate} from '../lib/model.mjs';
import {parseSource,collectOne,collectDue} from '../lib/collectors.mjs';
import {validateSignal,validateFeed} from '../lib/validation.mjs';
const data=name=>JSON.parse(readFileSync(new URL('../data/'+name+'.json',import.meta.url)));
const signals=data('signals'),categories=data('categories'),now=new Date('2026-09-17T12:00:00Z');
test('requested multiplicative formula is normalized, floored and bounded',()=>{
 const factors={exposure:100,severity:100,confidence:100,persistence:100,velocity:100,dependency:100,substitutability:100};
 assert.equal(materiality(factors).score,100);assert.equal(materiality({...factors,severity:50}).score,50);assert.equal(materiality({...factors,severity:0}).score,0);
 assert.equal(materiality({...factors,substitutability:0}).score,100);assert.equal(materiality({...factors,severity:null}).score,null);
 assert.equal(materiality(signals[0].factors).score,47);
});
test('expired, unreviewed, future-dated and unsupported signals never score',()=>{
 const s=signals[0];assert.ok(eligible(s,now));assert.ok(!eligible({...s,expiresAt:'2026-09-16'},now));assert.ok(!eligible({...s,status:'candidate'},now));assert.ok(!eligible({...s,observedAt:'2027-01-01'},now));assert.ok(!eligible(s,now,new Set(['not-this-source'])));
});
test('unknown is not zero and duplicates cannot inflate the posture',()=>{
 const a=assess(signals,categories,now),duplicate=assess([...signals,...signals],categories,now);
 assert.equal(a.observedScore,duplicate.observedScore);assert.equal(a.indicators.find(i=>i.category==='Cyber / OT').score,null);
 assert.equal(assess([],categories,now).posture,'Watch');assert.equal(assess([],categories,now).observedScore,null);
});
test('urgent response can override low multiplicative scores without changing the score',()=>{
 const s={...signals[0],factors:{...signals[0].factors,velocity:0},urgentOverride:{level:'Critical',reason:'Verified applicable emergency'}};
 const a=assess([s],categories,now);assert.equal(a.posture,'Critical');assert.equal(a.observedScore,0);
});
test('correlated alternatives have less effective independence',()=>{
 const a={dependencies:{region:1}},b={dependencies:{other:1}};
 assert.equal(failureCorrelation([a,a]).effectiveRedundancy,1);assert.equal(failureCorrelation([a,b]).effectiveRedundancy,2);
 assert.equal(failureCorrelation([a,a]).score,100);assert.equal(failureCorrelation([a,b]).score,0);
 assert.equal(failureCorrelation([{...a,unknown:true},b]).effectiveRedundancy,null);
 assert.throws(()=>failureCorrelation([{dependencies:{a:-1}}]));assert.throws(()=>failureCorrelation([{...a,weight:-1}]));
});
test('Brier scoring excludes unresolved forecasts and rejects invalid probabilities',()=>{
 const stats=calibration([{probability:.8,outcome:1},{probability:.8,outcome:null},{probability:.3,outcome:1}]);
 assert.equal(stats.resolved,2);assert.ok(Math.abs(stats.brier-.265)<.0001);assert.equal(stats.falseNegatives,1);assert.throws(()=>calibration([{probability:1.5,outcome:1}]));
});
test('yesterday must really exist; no nearest-day substitution',()=>{
 assert.equal(yesterdaySnapshot([{date:'2026-09-15'}],now),null);assert.equal(yesterdaySnapshot([{date:'2026-09-16'}],now).date,'2026-09-16');
});
test('persona review includes distinct quality and commercial decisions',()=>{
 const p=personas(assess(signals,categories,now));assert.ok(p.length>=3&&p.length<=5);assert.ok(p.some(v=>v.role==='Quality / Food Safety'));assert.ok(p.some(v=>v.role==='Sales / Business Development'||v.role==='CEO'));
 assert.ok(p.filter(v=>v.signal.id==='S04').every(v=>v.label!=='NEW ISSUE'));
});
test('NWS parsing keeps regional candidates separate from facility facts',()=>{
 const parsed=parseSource({id:'nws-il',adapter:'nws',category:'Facility / weather',url:'https://weather.gov'},JSON.stringify({features:[{id:'one',properties:{event:'Flood Warning',areaDesc:'A distant county',sent:'2026-09-17'}}]}));
 assert.equal(parsed[0].status,'candidate');assert.equal(parsed[0].evidenceClass,'INFERRED');assert.match(parsed[0].scope,/County/);assert.equal(parsed[0].facilityIds,undefined);
 assert.deepEqual(parseSource({adapter:'nws'},'{"features":[]}'),[]);assert.throws(()=>parseSource({adapter:'nws'},'{}'));
});
test('collection failure is persisted, never read as no risks',async()=>{
 const source={id:'test',adapter:'page',endpoint:'https://example.com',url:'https://example.com',name:'Test'};
 const blocked=await collectOne(source,{},async()=>new Response('blocked',{status:403}),now);
 assert.equal(blocked.state.status,'blocked');assert.equal(blocked.candidates.length,0);
 const error=await collectOne({...source,adapter:'nws'},{},async()=>new Response('{}',{status:200}),now);assert.equal(error.state.status,'error');
});
test('FDA dates render as ISO while distinguishing report and recall initiation',()=>{
 const source={id:'fda-recalls',adapter:'fda',url:'https://api.fda.gov'};
 const [record,bad]=parseSource(source,JSON.stringify({results:[{recall_number:'A',report_date:'20260909',recall_initiation_date:'20260820'},{recall_number:'B',report_date:'20260230'}]}));
 assert.equal(record.observedAt,'2026-09-09');assert.equal(record.recallInitiationDate,'2026-08-20');assert.equal(record.dateType,'FDA enforcement report date');assert.equal(bad.observedAt,null);assert.equal(record.status,'candidate');
});
test('cadence avoids repeated fetching and page changes never publish scores',async()=>{
 const s={id:'x',adapter:'page',url:'https://example.com',cadenceHours:24,priority:1};let calls=0;
 const result=await collectDue([s],[{sourceId:'x',status:'ok',fetchedAt:now.toISOString()}],{now,fetcher:async()=>{calls++;return new Response('okay')}});
 assert.equal(calls,0);assert.equal(result.attempted,0);assert.equal(parseSource(s,'<title>New release</title>')[0].status,'candidate');
});
test('publication rejects unsafe shapes and preserves actual retrieval provenance',()=>{
 const w={categories,signals,citations:data('citations'),facilities:data('facilities'),candidates:[],states:[]};
 const s={...signals[0],reviewedAt:'2026-09-17'};
 assert.throws(()=>validateSignal({...s,roles:[{}]},w,now));assert.throws(()=>validateSignal({...s,expiresAt:'2026-02-30'},w,now));assert.throws(()=>validateSignal({...s,sourceIds:['uncollected']},w,now));
 assert.equal(validateSignal(s,w,new Date('2026-09-18')).retrievedAt,'2026-09-17');assert.equal(isoDate('2026-02-30'),false);
});
test('repository import cannot downgrade newer collection or import malformed observations',()=>{
 const w={sources:[{id:'x'}],states:[{sourceId:'x',fetchedAt:'2026-09-17'}],categories};
 const result=validateFeed({collectedAt:'2026-09-17',states:[{sourceId:'x',status:'ok',fetchedAt:'2026-09-16'}],candidates:[{id:'bad',sourceId:'x',title:{}}],history:[]},w);
 assert.equal(result.states.length,0);assert.equal(result.candidates.length,0);
});
test('baseline graph is referentially consistent and keeps contact-site allocation uncertain',()=>{
 const g=data('graph'),ids=new Set(g.nodes.map(n=>n.id)),citations=new Set(data('citations').map(c=>c.id));
 for(const e of g.edges){assert.ok(ids.has(e.source)&&ids.has(e.target),e.id);for(const id of e.sourceIds)assert.ok(citations.has(id),id);}
 assert.equal(g.edges.find(e=>e.id==='E016').evidenceClass,'INFERRED');assert.equal(g.edges.find(e=>e.id==='E007').source,'topfox-unit');
 for(const h of data('hypotheses'))for(const id of h.sourceIds)assert.ok(citations.has(id));
});
