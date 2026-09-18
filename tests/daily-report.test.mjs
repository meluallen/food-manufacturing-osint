import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {assess} from '../lib/model.mjs';

test('second-day brief uses real yesterday and does not repeat first-day changed guidance',async()=>{
 const root=await mkdtemp(join(process.cwd(),'.watershed-report-test-'));
 try {
  const now=new Date(),day=now.toISOString().slice(0,10);
  const priorDate=new Date(now);priorDate.setUTCDate(priorDate.getUTCDate()-1);
  const yesterday=priorDate.toISOString().slice(0,10);
  const load=async name=>JSON.parse(await readFile(new URL('../data/'+name+'.json',import.meta.url),'utf8'));
  const categories=await load('categories'),citations=await load('citations');
  const original=(await load('signals'))[0];
  const signal={...original,observedAt:yesterday,retrievedAt:yesterday,reviewedAt:yesterday,expiresAt:day,coverageChange:'Baseline-only change text must not recur.'};
  const prior=assess([signal],categories,priorDate);
  for(const dir of ['scripts','lib','data/runtime','data/daily-observations'])await mkdir(join(root,dir),{recursive:true});
  for(const path of ['scripts/daily-report.mjs','lib/model.mjs'])await copyFile(new URL('../'+path,import.meta.url),join(root,path));
  const files={signals:[signal],categories,citations,sources:[], 'ground-truth':[], forecasts:[],hypotheses:[],
   'runtime/latest':{states:[],candidates:[],collectedAt:now.toISOString(),history:[{date:yesterday,indicators:prior.indicators,signals:[signal]}]},
   ['daily-observations/'+day]:{date:day,reviewedAt:day,observations:[],reviewNotes:['Test fixture'],baselineNote:'Only real snapshots.'}};
  for(const [name,value] of Object.entries(files))await writeFile(join(root,'data',name+'.json'),JSON.stringify(value));
  execFileSync(process.execPath,['scripts/daily-report.mjs'],{cwd:root});
  const markdown=await readFile(join(root,'docs/daily',day+'.md'),'utf8');
  const report=JSON.parse(await readFile(join(root,'data/daily',day+'.json'),'utf8'));
  assert.ok(markdown.includes('Yesterday’s markers use the recorded '+yesterday+' snapshot.'));
  assert.ok(!markdown.includes('no previous-calendar-day snapshot exists'));
  assert.ok(!markdown.includes('Baseline-only change text must not recur.'));
  assert.ok(report.personas.every(p=>p.label==='GUIDANCE STABLE'));
  assert.ok(report.indicators.filter(i=>i.score!==null).every(i=>i.delta===0));
 } finally {await rm(root,{recursive:true,force:true});}
});
