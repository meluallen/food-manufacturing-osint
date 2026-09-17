/** Versioned public intelligence methodology. No inferred company exposure is a fact. */
export const MODEL_VERSION = '1.0.0';
export const FACTORS = ['exposure','severity','confidence','persistence','velocity','dependency','substitutability'];
export const DAY = 86400000;
export const IMPACT_DOMAINS=['Revenue','Margin','Customer service / OTIF','Ingredient availability','Ingredient cost','Packaging','Transportation','Energy','Labor','Production capacity','Equipment / maintenance','Quality / food safety','Regulatory','Cyber / OT','Customer demand','Growth opportunity'];
export const ROLES=['CEO','CFO','COO','Supply Chain','Plant Manager','Engineering','Quality / Food Safety','Sales / Business Development','Customer Experience','HR / Talent','CISO / IT','R&D / Innovation'];
export function isoDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function materiality(factors) {
  if (!factors || FACTORS.some(k => !Number.isFinite(factors[k]) || factors[k] < 0 || factors[k] > 100)) return {score:null, raw:null, flags:['Incomplete or invalid factors']};
  const denominator = Math.max(1, factors.substitutability);
  const raw = FACTORS.slice(0,6).reduce((v,k) => v * factors[k],1) / denominator;
  const normalized = 100 * FACTORS.slice(0,6).reduce((v,k) => v * factors[k]/100,1) / (denominator/100);
  return {score:Math.round(Math.min(100,normalized)*10)/10, raw, uncapped:normalized, flags:[...(factors.substitutability < 1 ? ['Substitutability denominator floored at 1/100']:[]), ...(normalized>100?['Display capped at 100']:[])]};
}
export function eligible(signal, now = new Date(), knownSources) {
  return signal.status === 'reviewed' && signal.sourceIds?.length > 0 && (!knownSources||signal.sourceIds.every(id=>knownSources.has(id))) && (!signal.observedAt||(isoDate(signal.observedAt)&&new Date(signal.observedAt)<=now)) && !!signal.causalPath && isoDate(signal.expiresAt) && new Date(signal.expiresAt+'T23:59:59Z') >= now && new Date(signal.reviewedAt) <= now && materiality(signal.factors).score !== null;
}
export function assess(signals, categories, now = new Date(), knownSources) {
  const active = signals.filter(s => eligible(s,now,knownSources)).map(s=>({...s, ...materiality(s.factors)}));
  const indicators = categories.map(category => {
    const components=active.filter(s=>s.category===category).sort((a,b)=>b.score-a.score);
    // Max is invariant to duplicate stories, source counts, and correlated groups.
    const leader=components[0];
    return {category, score:leader?.score ?? null, confidence:leader?.confidence ?? 'Unassessed', direction:leader?.direction ?? null, componentIds:components.map(s=>s.id)};
  });
  const threats=active.filter(s=>s.direction!=='Opportunity');
  const observedScore=threats.length?Math.max(...threats.map(s=>s.score)):null;
  const coverage=indicators.filter(i=>i.score!==null).length;
  const labels=['Normal','Watch','Elevated','High','Critical'];
  const observedPosture=observedScore===null?null:labels[Math.min(4,Math.floor(observedScore/20))];
  const coverageGuard = coverage < categories.length && (observedScore===null || observedScore<20);
  const urgent=active.filter(s=>s.urgentOverride&&['High','Critical'].includes(s.urgentOverride.level)&&s.urgentOverride.reason&&s.direction!=='Opportunity');
  const basePosture=coverageGuard?'Watch':observedPosture;
  const posture=urgent.reduce((p,s)=>labels.indexOf(s.urgentOverride.level)>labels.indexOf(p)?s.urgentOverride.level:p,basePosture);
  return {modelVersion:MODEL_VERSION,asOf:now.toISOString(),indicators,active,coverage,total:categories.length,observedScore,observedPosture,posture,provisional:coverage<categories.length,coverageGuard,urgentOverrides:urgent.map(s=>({id:s.id,...s.urgentOverride}))};
}
export function yesterdaySnapshot(history, now=new Date()) {
  const day=new Date(now.getTime()-DAY).toISOString().slice(0,10);
  return history.filter(h=>h.date===day).sort((a,b)=>(b.asOf??b.date).localeCompare(a.asOf??a.date))[0] ?? null;
}
export function personas(assessment, previousSignals=[]) {
  const selected=[],usedRoles=new Set(),usedGroups=new Set();
  for(const signal of [...assessment.active].sort((a,b)=>b.score-a.score)){
    if(usedGroups.has(signal.group))continue;
    const role=(signal.roles??[]).find(role=>ROLES.includes(role)&&!usedRoles.has(role));if(!role)continue;
    usedRoles.add(role);usedGroups.add(signal.group);
    const old=previousSignals.find(s=>s.id===signal.id);
    const recent=signal.observedAt&&Date.parse(signal.observedAt)<=Date.parse(assessment.asOf)&&(Date.parse(assessment.asOf)-Date.parse(signal.observedAt))/DAY<=7;
    const label=old?(materiality(old.factors).score>signal.score+2&&signal.direction!=='Opportunity'?'IMPROVING':old.revision!==signal.revision?'CHANGED GUIDANCE':'GUIDANCE STABLE'):recent?'NEW ISSUE':'GUIDANCE STABLE';
    selected.push({role,signal,signals:assessment.active.filter(s=>s.roles?.includes(role)),priority:signal.score,label,baseline:!old});
    if(selected.length===5)break;
  }
  return selected;
}
/** PSD correlation from non-negative common-dependency loadings, plus independent residual. */
export function failureCorrelation(alternatives) {
  if (!alternatives.length) return {score:null,effectiveRedundancy:null,matrix:[],unknown:true};
  if(alternatives.some(a=>!a.dependencies||Object.values(a.dependencies).some(v=>!Number.isFinite(v)||v<0)||!Number.isFinite(a.weight??1)||(a.weight??1)<=0||!Number.isFinite(a.independent??0)||(a.independent??0)<0))throw Error('Dependencies and residuals must be finite and nonnegative; weights must be positive.');
  const independentCount=alternatives.reduce((s,a)=>s+(a.weight??1),0)**2/alternatives.reduce((s,a)=>s+(a.weight??1)**2,0);
  if(alternatives.some(a=>a.unknown)) return {score:null,effectiveRedundancy:null,range:[1,independentCount],matrix:[],unknown:true};
  const norms=alternatives.map(a=>Math.sqrt(Object.values(a.dependencies).reduce((s,v)=>s+v*v,0)+(a.independent??0)**2));
  if(norms.some(v=>!v)) return {score:null,effectiveRedundancy:null,range:[1,independentCount],matrix:[],unknown:true};
  const matrix=alternatives.map((a,i)=>alternatives.map((b,j)=>i===j?1:Object.keys(a.dependencies).reduce((sum,k)=>sum+a.dependencies[k]*(b.dependencies[k]??0),0)/(norms[i]*norms[j])));
  const weights=alternatives.map(a=>a.weight??1);
  const total=weights.reduce((s,v)=>s+v,0);
  const variance=matrix.reduce((s,row,i)=>s+row.reduce((t,r,j)=>t+weights[i]*weights[j]*r,0),0);
  const independent=weights.reduce((s,v)=>s+v*v,0);
  return {score:total*total===independent?0:100*(variance-independent)/(total*total-independent),effectiveRedundancy:total*total/variance,matrix,unknown:false};
}
export function calibration(forecasts) {
  if(forecasts.some(f=>!Number.isFinite(f.probability)||f.probability<0||f.probability>1))throw Error('Forecast probabilities must lie within [0,1].');
  const resolved=forecasts.filter(f=>[0,1].includes(f.outcome)&&Number.isFinite(f.probability));
  return {resolved:resolved.length,unresolved:forecasts.length-resolved.length,brier:resolved.length?resolved.reduce((s,f)=>s+(f.probability-f.outcome)**2,0)/resolved.length:null,falsePositives:resolved.filter(f=>f.probability>=.5&&f.outcome===0).length,falseNegatives:resolved.filter(f=>f.probability<.5&&f.outcome===1).length,bins:[0,.2,.4,.6,.8].map(lo=>{const r=resolved.filter(f=>f.probability>=lo&&(lo===.8?f.probability<=1:f.probability<lo+.2));return {range:[lo,lo+.2],n:r.length,predicted:r.length?r.reduce((s,f)=>s+f.probability,0)/r.length:null,observed:r.length?r.reduce((s,f)=>s+f.outcome,0)/r.length:null};})};
}
export function sourceHealth(source,state,now=new Date()) {
  if(source.adapter==='manual') return 'Manual review';
  if(source.adapter==='key') return 'Key required';
  if(!state) return 'Not collected';
  if(state.status!=='ok') return state.status==='blocked'?'Blocked':'Fetch error';
  return now-Date.parse(state.fetchedAt)>source.staleHours*3600000?'Stale':'Current';
}
export function validPublicUrl(value) {
  try { const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[|.*\.local$)/i.test(u.hostname); } catch{return false;}
}
