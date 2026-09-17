/* Guarded parsers for public tables. Measurements are discovery records, never company facts. */
const MONTHS=['january','february','march','april','may','june','july','august','september','october','november','december'];
const clean=s=>String(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const rows=html=>[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>clean(c[1])));
const numeric=s=>{const value=String(s).replace(/\(\s*p\s*\)/gi,'').trim();return /^-?\d+(?:\.\d+)?$/.test(value)?Number(value):null;};
const period=(month,year)=>{const m=MONTHS.findIndex(v=>v.startsWith(month.toLowerCase().replace('.','')));if(m<0||!/^20\d\d$/.test(year))throw Error('Unrecognized reference period');return `${year}-${String(m+1).padStart(2,'0')}`;};
const requireNumber=(v,label)=>{if(v===null||!Number.isFinite(v))throw Error(`Missing numeric ${label}`);return v;};
const PPI={
 '01-11':'Fresh fruits and melons','01-13':'Fresh and dry vegetables','01-2':'Grains','01-8301':'Oilseeds',
 '02-3':'Dairy products','02-4':'Processed fruits and vegetables','02-78':'Shortening and cooking oils',
 '05-43':'Industrial electric power','05-53':'Industrial natural gas','06-6':'Plastic resins and materials',
 '07-22':'Unsupported plastic film, sheet, and other shapes','09-14':'Paperboard','09-15':'Converted paper / paperboard','30-12':'Truck freight',
 '11-61':'Food products machinery','55-1':'Commercial and industrial machinery and equipment repair and maintenance'
};
export function parseBenchmarks(source,body){
 if(source.adapter==='bls-ppi'){
  const caption=clean(body).match(/\[([A-Za-z]+) (20\d\d)\]/);if(!caption||!body.includes('Commodity code'))throw Error('BLS PPI table header missing');
  const referencePeriod=period(caption[1],caption[2]),found=new Map();
  const header=rows(body).find(r=>r[0]==='Group code'&&r[1]==='Item code');
  const last=header?.at(-1)?.match(/([A-Za-z.]+) to ([A-Za-z.]+)/);
  if(header?.length!==8||!last||period(last[2],caption[2])!==referencePeriod)throw Error('BLS PPI comparison columns changed');
  for(const r of rows(body)){
   if(r.length!==9)continue;const code=`${r[1]}-${r[2]}`;if(!PPI[code])continue;
   const record={id:`${code}:${referencePeriod}`,label:PPI[code],referencePeriod,unit:'percent change',value:requireNumber(numeric(r[8]),code),comparison:'month over month',yearOverYear:requireNumber(numeric(r[3]),code),yearOverYearSeasonalAdjustment:'NSA',seasonalAdjustment:/\(\s*2\s*\)/.test(r[0])?'NSA':'SA',geography:'United States',preliminary:true,seriesCode:code};
   if(found.has(code)&&JSON.stringify(found.get(code))!==JSON.stringify(record))throw Error(`Conflicting duplicate PPI row ${code}`);
   found.set(code,record);
  }
  if(!['02-3','06-6','07-22','09-14'].every(k=>found.has(k)))throw Error('Required PPI commodity rows missing');
  return [...found.values()];
 }
 if(source.adapter==='eia-electricity'){
  const text=clean(body),caption=text.match(/by State, ([A-Za-z]+) (20\d\d) and (20\d\d) \(Cents per Kilowatthour\)/);
  const sectors=rows(body).find(r=>r.includes('Residential')&&r.includes('Industrial'));
  if(!caption||sectors?.join('|')!=='|Residential|Commercial|Industrial|Transportation|All Sectors')throw Error('EIA industrial price header missing or reordered');
  const referencePeriod=period(caption[1],caption[2]),previousPeriod=period(caption[1],caption[3]);
  if(Number(caption[2])-Number(caption[3])!==1)throw Error('EIA comparison year changed');
  return ['Illinois','Wisconsin'].map(state=>{const r=rows(body).find(r=>r[0]===state&&r.length===11);if(!r)throw Error(`EIA state row missing: ${state}`);
   const value=requireNumber(numeric(r[5]),state),previousValue=requireNumber(numeric(r[6]),state);if(value<0||previousValue<=0)throw Error('Invalid electricity price');
   return {id:`${state}:${referencePeriod}`,label:'Industrial electricity average price',referencePeriod,previousPeriod,unit:'cents/kWh',value,previousValue,yearOverYear:100*(value/previousValue-1),comparison:'same month previous year',seasonalAdjustment:'NSA',geography:state,preliminary:true};
  });
 }
 if(source.adapter==='bls-labor'){
  const table=rows(body),header=table.find(r=>r[0]==='Data Series');if(!header||header.length!==8)throw Error('BLS labor table header changed');
  const periods=header.slice(2).map(v=>{const p=v.match(/^([A-Za-z.]+) (20\d\d)$/);if(!p)throw Error('BLS labor period missing');return period(p[1],p[2]);});
  return ['Unemployment Rate','Manufacturing'].map(label=>{const index=table.findIndex(r=>r[0]?.startsWith(label+' ('));const r=table[index];if(!r||r.length!==8)throw Error(`BLS labor row missing: ${label}`);
   const value=requireNumber(numeric(r[7]),label),previousValue=requireNumber(numeric(r[6]),label);
   const yoy=label==='Manufacturing'?numeric(table[index+1]?.[7]):null;
   if(value<0||(label==='Unemployment Rate'&&value>100))throw Error('Invalid labor value');
   return {id:`${label}:${periods.at(-1)}`,label,referencePeriod:periods.at(-1),previousPeriod:periods.at(-2),unit:label==='Unemployment Rate'?'percent':'thousand jobs',value,previousValue,yearOverYear:yoy,comparison:'previous month; not seasonally adjusted',seasonalAdjustment:'NSA',geography:source.geography,preliminary:/\(\s*p\s*\)/i.test(r[7])};
  });
 }
 if(source.adapter==='bls-api'){
  const data=JSON.parse(body);if(data.status!=='REQUEST_SUCCEEDED'||!Array.isArray(data.Results?.series))throw Error('BLS API request failed');
  return data.Results.series.map(s=>{if(s.seriesID!==source.seriesCode)throw Error('Unexpected BLS series');const observations=s.data.filter(d=>/^M(0[1-9]|1[0-2])$/.test(d.period)).map(d=>({period:`${d.year}-${d.period.slice(1)}`,value:requireNumber(numeric(d.value),s.seriesID),preliminary:d.footnotes?.some(f=>f.code==='P')})).sort((a,b)=>b.period.localeCompare(a.period));
   const latest=observations[0];if(!latest)throw Error('No BLS monthly values');
   return {id:`${s.seriesID}:${latest.period}`,label:source.seriesLabel,seriesCode:s.seriesID,referencePeriod:latest.period,unit:'index, 1982=100',value:latest.value,comparison:'index level; not a transaction price',seasonalAdjustment:'NSA',geography:'United States',preliminary:latest.preliminary,history:observations};
  });
 }
 return null;
}
