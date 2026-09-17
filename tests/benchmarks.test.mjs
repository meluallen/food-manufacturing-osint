import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBenchmarks} from '../lib/benchmarks.mjs';
import {parseSource} from '../lib/collectors.mjs';
const tr=cells=>'<tr>'+cells.map(c=>`<td>${c}</td>`).join('')+'</tr>';
const ppiHeader='[August 2026] Commodity code'+tr(['Group code','Item code','Aug. 2025 to Aug. 2026','Mar. to Apr.','Apr. to May','May to June','June to July','July to Aug.']);
const ppiRows=[['Dairy products (2)','02','3','-0.7','0','0','0','0','-1.0'],['Plastic resins','06','6','6.6','0','0','0','0','-0.8'],['Unsupported plastic film (2)','07','22','12.5','0','0','3.3','0','-0.5'],['Paperboard (2)','09','14','5.1','0','0','0','0','2.3']];
test('PPI preserves NSA footnotes and separates annual from monthly columns',()=>{
 const data=parseBenchmarks({adapter:'bls-ppi'},ppiHeader+ppiRows.map(tr).join(''));
 assert.equal(data[0].value,-1);assert.equal(data[0].seasonalAdjustment,'NSA');assert.equal(data[1].seasonalAdjustment,'SA');
 assert.equal(data[2].yearOverYear,12.5);assert.equal(data[1].yearOverYearSeasonalAdjustment,'NSA');assert.equal(data[2].value,-.5);assert.equal(data[3].referencePeriod,'2026-08');
 assert.throws(()=>parseBenchmarks({adapter:'bls-ppi'},ppiHeader.replace('July to Aug.','Aug. to Sep.')+ppiRows.map(tr).join('')));
 assert.throws(()=>parseBenchmarks({adapter:'bls-ppi'},ppiHeader+ppiRows.slice(1).map(tr).join('')));
 assert.throws(()=>parseBenchmarks({adapter:'bls-ppi'},ppiHeader+ppiRows.map(tr).join('')+tr([...ppiRows[0].slice(0,8),'10'])));
});
test('OSM snapshots keep mapping timestamps separate from incidents and reject partial responses',()=>{
 const source={id:'osm',name:'Regional map',adapter:'osm',url:'https://overpass-api.de/api/interpreter'};
 const snapshot={elements:[{type:'way',id:1,tags:{ref:'I 74'}}],osm3s:{timestamp_osm_base:'2026-09-17T12:00:00Z'}};
 const [candidate]=parseSource(source,JSON.stringify(snapshot));assert.equal(candidate.observedAt,null);assert.equal(candidate.status,'candidate');assert.equal(candidate.facilityIds,undefined);assert.match(candidate.scope,/do not establish company use/);
 assert.throws(()=>parseSource(source,JSON.stringify({...snapshot,remark:'runtime error: timeout'})));
});
test('electricity selects the industrial sector and same-month prior year; fails on reordered sectors',()=>{
 const body='by State, June 2026 and 2025 (Cents per Kilowatthour)'+tr(['','Residential','Commercial','Industrial','Transportation','All Sectors'])+tr(['Illinois','20','19','14','13','10.65','9.65','9','8','15','14'])+tr(['Wisconsin','20','19','14','13','9.95','9.62','9','8','15','14']);
 const [il,wi]=parseBenchmarks({adapter:'eia-electricity'},body);assert.equal(il.value,10.65);assert.equal(il.previousPeriod,'2025-06');assert.ok(Math.abs(il.yearOverYear-10.3627)<.001);assert.equal(wi.value,9.95);
 assert.throws(()=>parseBenchmarks({adapter:'eia-electricity'},body.replace('<td>Commercial</td><td>Industrial</td>','<td>Industrial</td><td>Commercial</td>')));
});
test('labor retains reference period, preliminary flags and units without inventing a release date',()=>{
 const body=tr(['Data Series','Back Data','Feb 2026','Mar 2026','Apr 2026','May 2026','June 2026','July 2026'])+tr(['Unemployment Rate (2)','',4,4,4,4,4,'(p) 3.3'])+tr(['Manufacturing (3)','',8,8,8,8,8,'(p) 8.2'])+tr(['12-month percent change','',0,0,0,0,0,'(p) -1.2']);
 const source={id:'labor',adapter:'bls-labor',geography:'Example metro',url:'https://www.bls.gov/example'};
 const records=parseBenchmarks(source,body);assert.equal(records[0].value,3.3);assert.equal(records[0].seasonalAdjustment,'NSA');assert.equal(records[1].unit,'thousand jobs');assert.equal(records[1].yearOverYear,-1.2);
 const candidates=parseSource(source,body);assert.equal(candidates[0].status,'candidate');assert.equal(candidates[0].observedAt,null);assert.equal(candidates[0].factors,undefined);
});
test('BLS API rejects wrong series and excludes annual averages from latest-month selection',()=>{
 const source={adapter:'bls-api',seriesCode:'WPU0914',seriesLabel:'Paperboard'};
 const body=JSON.stringify({status:'REQUEST_SUCCEEDED',Results:{series:[{seriesID:'WPU0914',data:[{year:'2026',period:'M13',value:'999',footnotes:[]},{year:'2026',period:'M08',value:'373.349',footnotes:[]}]}]}});
 assert.equal(parseBenchmarks(source,body)[0].value,373.349);assert.throws(()=>parseBenchmarks({...source,seriesCode:'WRONG'},body));
});
