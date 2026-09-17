"""Idempotent corrections from the independent evidence and operational review."""
import json,pathlib
D=pathlib.Path(__file__).resolve().parent.parent/'data'
def read(n):return json.loads((D/(n+'.json')).read_text())
def save(n,v):(D/(n+'.json')).write_text(json.dumps(v,indent=2,ensure_ascii=False)+'\n')
g=read('graph'); dates={'edge-2024':'2024-04-18','heartland-2026':'2026-01-06','kellogg-2009':'2009-07-13'}
for obj in g['nodes']+g['edges']:
 obj['retrievedAt']='2026-09-17';obj['evidenceDate']=next((dates[s] for s in obj.get('sourceIds',[]) if s in dates),None)
 if obj['evidenceClass']=='HISTORICAL':obj['asOf']=obj['evidenceDate']
for e in g['edges']:
 if e['id']=='E007':e.update(source='topfox-unit',relation='Public contact address')
 if e['id']=='E008':e.update(source='heartland-unit',relation='Listed business address')
 if e['id']=='E016':e.update(evidenceClass='INFERRED',relation='Site allocation hypothesis',note='Brand seed capability established; roasting at this contact address unverified.')
def edge(s,t,r,cls='INFERRED',sources=None,note='Dependency hypothesis; actual procurement, installed equipment, routing and applicability require verification.'):
 if any(e['source']==s and e['target']==t and e['relation']==r for e in g['edges']):return
 g['edges'].append(dict(id=f'E{len(g["edges"])+1:03}',source=s,target=t,relation=r,evidenceClass=cls,sourceIds=sources or [],note=note,asOf='2026-09-17',retrievedAt='2026-09-17',evidenceDate=None))
edge('human-unit','gridley','Potential allocation',sources=['ws-careers'])
edge('pet-unit','wisconsin','Potential allocation',sources=['ws-careers'])
for line in [n['id'] for n in g['nodes'] if n['type']=='Production Line']:
 edge('Freeze-dried',line,'Planned process step','HISTORICAL',['edge-2024'],'2024 proposal, not verified commissioned')
 edge(line,'Toddler nutrition','Planned product domain','HISTORICAL',['edge-2024'],'2024 proposal, not verified commissioned')
for p,domains in {'Freeze-dried':['Toddler nutrition','Ingredients','Pet nutrition','Dietary supplements'],'Baked':['Pet nutrition','Human snacks'],'Roasted':['Human snacks'],'Popped':['Human snacks']}.items():
 for d in domains:edge(p,d,'Advertised capability fit','CONFIRMED',['ws-capabilities'],'Company capability statement; current sales mix unknown')
for s,t,r in [('X02','west-fruit','Potential origin'),('X04','midwest-crops','Potential origin'),('X07','midwest-crops','Potential origin'),('X14','import-origin','Potential origin'),('west-fruit','reefer','Possible inbound mode'),('import-origin','ocean','Possible inbound mode'),('midwest-crops','truck','Possible inbound mode'),('X15','film','Candidate package'),('film','packers','Potential equipment need'),('cartons','packers','Potential equipment need'),('packers','electricity','Utility dependency'),('vacuum','electricity','Utility dependency'),('ovens','gas','Potential utility'),('controls','erp','Potential shared digital dependency'),('Freeze-dried','vacuum','Process equipment class'),('Baked','ovens','Process equipment class'),('Roasted','ovens','Process equipment class'),('truck','risk-3','Transport disruption channel'),('reefer','risk-3','Transport disruption channel'),('ocean','risk-10','Trade/chokepoint channel'),('west-fruit','risk-0','Crop disruption channel'),('midwest-crops','risk-0','Crop disruption channel'),('electricity','risk-4','Energy channel'),('controls','risk-8','Cyber channel'),('erp','risk-8','Cyber channel'),('film','risk-5','Packaging constraint'),('Toddler nutrition','D03','Customer archetype'),('Pet nutrition','D05','Customer archetype'),('Pet nutrition','D06','Customer archetype'),('Ingredients','D02','Customer archetype'),('Dietary supplements','D07','Customer archetype'),('Private label','D08','Customer archetype'),('Contract manufacturing','D09','Customer archetype'),('D03','pc-human','Applicability review'),('D05','pc-animal','Applicability review'),('D07','supplements','Applicability review'),('pc-human','risk-7','Compliance channel'),('pc-animal','risk-7','Compliance channel'),('traceability','risk-7','Applicability channel'),('import-origin','importer','Importer applicability'),('importer','risk-10','Border compliance channel')]:edge(s,t,r)
for e in g['edges']:
 if e['evidenceClass']=='HISTORICAL' and 'edge-2024' in e['sourceIds']:e.update(evidenceDate='2024-04-18',asOf='2024-04-18')
save('graph',g)
signals=read('signals')
impacts=[['Transportation','Margin','Customer service / OTIF'],['Ingredient availability','Ingredient cost','Margin'],['Regulatory','Quality / food safety'],['Customer demand','Revenue','Growth opportunity'],['Production capacity','Revenue','Growth opportunity','Equipment / maintenance'],['Quality / food safety','Regulatory','Customer demand']]
for s,domains in zip(signals,impacts):
 s['impactDomains']=domains;s['roles']=['CISO / IT' if r=='IT / Security' else r for r in s['roles']]
 if s['id']=='S04':s['observedAt']=None;s['dateNote']='APPA projection publication date unverified; baseline evidence, not a new event on retrieval day.'
save('signals',signals)
hs=read('hypotheses')
for h,ids in zip(hs,[['ws-capabilities'],['ws-capabilities','appa'],['ws-capabilities'],['heartland-2026','deer-directory'],['topfox','heartland-2026'],['ws-careers']]):h['sourceIds']=ids
save('hypotheses',hs)
print('Evidence review corrections applied; graph has',len(g['edges']),'qualified edges.')
