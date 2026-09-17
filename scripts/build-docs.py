"""Render maintained A–I deliverables from the evidence model, without inventing metrics."""
import json,pathlib
ROOT=pathlib.Path(__file__).resolve().parent.parent;D=ROOT/'data';O=ROOT/'docs';O.mkdir(exist_ok=True)
def read(n):return json.loads((D/(n+'.json')).read_text())
def write(n,s):(O/n).write_text('\n'.join(line.rstrip() for line in s.strip().splitlines())+'\n')
citations={c['id']:c for c in read('citations')}
def refs(ids):return '; '.join(f"[{citations[i]['title']}]({citations[i]['url']}) (retrieved {citations[i]['retrievedAt']})" for i in ids if i in citations)
def table(headers,rows):
 def cell(v):return str(v).replace('|',' / ').replace('\n',' ')
 return '\n'.join(['| '+' | '.join(headers)+' |','| '+' | '.join(['---']*len(headers))+' |']+['| '+' | '.join(cell(v) for v in row)+' |' for row in rows])+'\n'
head='Baseline researched 17 September 2026. Every relationship retains its evidence class. Current public evidence does not establish actual customer mix, purchasing, recipes, installed OT, utilization, contracts or inventories.\n\n'
facts=read('ground-truth')
write('company-ground-truth.md','# A. Watershed Company Ground Truth\n\n'+head+'''Gridley is an established manufacturing location. The company website supports greater-Milwaukee operations at a regional level. A Bloomington-Normal office/headquarters lead is not sufficiently corroborated to displace the documented manufacturing base. This model deliberately separates the company, related businesses, contact addresses and production allocations.

Evidence classes: **CONFIRMED** means the precise claim is supported by current primary or highly reliable evidence; **HISTORICAL** means documented at an earlier date without assuming continuity; **INFERRED** means a hypothesis. A current web page reporting a planned project is confirmation of the statement, not commissioning.

'''+ '\n\n'.join(f"## {f['id']} · {f['topic']}\n\n**{f['evidenceClass']}** — {f['statement']}\n\n{f['note']}\n\nAs of {f['asOf']}; retrieved {f['retrievedAt']}; review due {f['reviewDue'] or 'on new evidence'}. {refs(f['sourceIds'])}" for f in facts)+'''

## Open ground-truth questions

- Exact ownership/capital relationships among Watershed, The Manna Group, Top Fox and Heartland; no directional ownership is assumed from shared grant paperwork or executives.
- Current commissioning and utilization of the 2024 Gridley proposal and the 2026 Deer Creek transition.
- Exact Wisconsin legal entity/site, which is not inferred from a competitor's Oak Creek location.
- Bloomington-Normal address function and current headquarters designation.
- Current named customers and suppliers. No account is established from document-directory labels, testimonials, social follows or category overlap.
- Certificate number, issuing body, site, standard version, audit scope and expiry before treating SQF marketing as a current verified certificate.
- Cold/frozen storage capacity, warehousing footprint, shipping modes and imported-input origins.

Current claims receive at least quarterly review; leadership, facilities, ownership and safety claims receive immediate review when a relevant new primary source appears. Preserve superseded versions. Do not reclassify inferred claims by repetition.
''')
facilities=read('facilities');g=read('graph')
write('facility-capability-graph.md','# B. Facility and capability graph\n\n'+head+table(['View','Evidence','Public precision','Platforms / attribution limits','Verify'],[(f['name'],f['evidenceClass'],f['precision']+': '+str(f.get('address') or f['location']),', '.join(f['platforms'])+'; '+f['context'],'; '.join(f['unknowns'])+' '+refs(f['sourceIds'])) for f in facilities])+'''
The interactive graph is in Company & graph. Its full portable representation is [`data/graph.json`](../data/graph.json), including node types, edge classes, citations, retrieval dates and separate historical evidence dates.

```mermaid
flowchart TD
 W[Watershed Foods] ---|2024 joint EDGE parties| M[The Manna Group]
 W -->|Manufacturing| G[Gridley]
 W -->|Region established| WI[Greater Milwaukee]
 W -.->|Reported sister business| TF[Top Fox]
 W -.->|Reported sister business| HF[Heartland]
 TF -->|Contact address| C[Congerville]
 HF -->|Village business listing| D[Deer Creek]
 G --> F[Freeze-dried]
 WI --> B[Baked / Popped]
 C -.->|Site allocation unverified| R[Roasted]
 D --> P[Popped]
```

No facility-security layout, access weakness, backup configuration, employee movement or sensitive operational detail is exposed. NWS state feeds require county/time matching before attaching an alert to a facility. Wisconsin cannot receive precise facility alerts until the site is sufficiently established.
''')
write('supply-chain-ontology.md','# C. Supply-chain ontology\n\n'+head+table(['Node type','Meaning'],[(t,{'Company':'Legal or public operating entity; ownership is a separate evidenced edge.','Business Unit':'Advertised division or related business; not automatically a legal subsidiary.','Facility':'Public operating presence, contact address or regional location with precision explicitly recorded.','Production Line':'Historical proposal unless actual installation/commissioning is documented.','Supplier Geography':'Hypothesized sourcing region; never inferred from category alone as actual origin.','Customer Segment':'Archetype rather than a named account.','External Risk':'Causal risk category, not evidence of a current incident.'}.get(t,'Evidence-qualified model node; actual deployment/use must be separately established.')) for t in g['nodeTypes']])+'''
Graph paths connect company → business unit → facility → process → proposed production line → product domain → potential ingredient inputs → packaging/equipment/utility needs and transport/origin hypotheses → customer archetypes → regulatory applicability → external risk.

This is a directed multigraph, not a mandatory single chain: electricity supports equipment; crop origin determines agricultural exposure; food form determines regulation; customers and processes have many-to-many links. A traversed path is no stronger than its least established edge. An inferred edge cannot upgrade a downstream entity or claim.

Required edge fields: stable ID, source, target, relation, evidenceClass, sourceIds, note, asOf, retrievedAt and evidenceDate. Production capacity is null until measured; absence of a public link is not evidence of independence.

Ownership, buys-from, sells-to, site allocation, certified-by and shares-failure-domain are distinct relations. Require direct evidence to add named procurement/account links. Keep dates and attribution limits with the edge.
''')
sources=read('sources')
write('source-catalog.md','# D. Public-data source catalog\n\n'+head+'''Structured feeds are parsed into unreviewed candidates. Page-based adapters detect content changes and queue a primary-source review; they do not manufacture numeric commodity observations. A cataloged endpoint is not proof it has been successfully fetched. Health distinguishes current, stale, blocked, fetch error, never collected, manual and key required.

The hourly GitHub workflow checks due sources in batches, respecting the cadences below. A scheduled daily analyst review verifies release dates, affected geography, scope and causal relevance before updating assessed signals. API limits, terms and source availability may require manual review. No paywall bypass or credential scraping is used.

'''+table(['ID / source','Coverage','Hours / stale after','Collection mode / validation'],[(f"{s['id']} · [{s['name']}]({s['url']})",s['scope'],f"{s['cadenceHours']} / {s['staleHours']}",f"{s['mode']} · {s['access']} · {s['validation']}") for s in sources])+'''
## Release and interpretation rules

- USDA monthly reports, weekly crop progress and annual acreage are distinguished from polling cadence. Keep commodity, geography, crop year, units and revision date. Broad corn/grain futures are an imperfect proxy for food-grade popcorn or pumpkin seed supply.
- Weather and river data require actual location/lane matching. Alert expiration is separate from retrieval time. An empty successful alert response is not proof of unaffected facilities.
- Commodity, energy and freight indexes are benchmarks; contract terms, surcharge lag, geography and pass-through determine company impact.
- FDA enforcement, recalls, rule proposals, guidance and final requirements have different legal meanings. Match product, legal entity, lot/form, applicability and effective dates.
- SEC, earnings calls, trade associations and corporate releases cover customer archetypes. No monitored public company becomes a Watershed customer through monitoring.
- KEV and ICS advisories require authorized inventory matching. A listed product vulnerability does not establish Watershed exposure or installed systems.
- Geopolitics is elevated only with a traceable ingredient, packaging, transport, energy, equipment, tariff, financing or demand channel. Unverified routes stay hypotheses.
- Reddit/social posts can discover leads only. No social assertion is automatically promoted to fact or executive scoring.
''')
write('risk-methodology.md','# E. External Risk Equation and governance\n\n'+head+'''## Requested equation

Materiality = Exposure × Severity × Confidence × Persistence × Velocity × Dependency ÷ Substitutability.

Store all seven factors on 0–100 scales. The raw ratio is retained. For a usable display, divide each factor by 100, apply the ratio, multiply by 100 and cap at 100. Substitutability is floored at 1/100; disclose the floor and saturation. Missing/invalid factors yield null. Seven factors of 50 yield 3.125/100: this multiplicative index is deliberately not a probability, dollars at risk or calibrated expected loss.

'''+table(['Factor','0 anchor','50 anchor','100 anchor'],[
('Exposure','No evidenced pathway','Plausible platform/category relevance; internal mix unknown','Verified extensive company exposure'),('Severity','No operational effect','Meaningful but manageable cost/service effect','Severe sustained disruption or safety consequence'),('Confidence','Unsupported','Mixed or incomplete evidence','Directly verified observation AND company applicability'),('Persistence','Transitory','Multiple operating cycles plausible','Long-duration structural condition'),('Velocity','No deterioration','Moderate rate of change','Rapid escalation within decision lead time'),('Dependency','Nonessential','Meaningful process dependency','No feasible operation without dependency'),('Substitutability','No approved alternative','Alternative needs qualification/time','Approved spare capacity available within impact window')])+'''
Baseline factors are explicit analyst judgments, not measurements of company exposure. The baseline is a starting priority order, to be recalibrated against outcomes and authorized internal information. Add sensitivity ranges when internal estimates differ; do not silently turn unknown spend share into 50% spend share.

## Aggregation, direction and urgent response

Domain score = maximum eligible reviewed component; every contributing component remains inspectable. Max aggregation cannot be inflated by duplicate articles or overlapping correlated signals. It can understate simultaneous independent risks, so reviewers must examine the component list and documented escalation decisions.

Posture uses the maximum Threat/Mixed score: Normal <20, Watch 20–<40, Elevated 40–<60, High 60–<80, Critical ≥80. Opportunity scores do not offset threats. Missing domains remain null; incomplete coverage prevents Normal and creates a visibly provisional Watch floor without altering observed scores.

**Safety/continuity gate:** the equation does not determine whether to respond to a verified applicable recall, unsafe product, active emergency warning or critical operational incident. A reviewer can select High or Critical with a specific evidenced urgent-response rationale. Display the override separately from the equation and preserve its audit trail. Zero velocity can mathematically erase a serious persistent issue; the urgent gate addresses that limitation without secretly changing the requested equation.

Time-to-impact: Immediate 0–7 days; Near 8–30; Tactical 1–3 months; Strategic 3–24 months. Resolve boundary overlap consistently: day 30 belongs to Near, three months to Tactical. Confidence labels are Confirmed, High, Medium, Low, Speculative and are separate from an observation's evidence class.

'''+table(['Impact domain'],[(x,) for x in ['Revenue','Margin','Customer service / OTIF','Ingredient availability','Ingredient cost','Packaging','Transportation','Energy','Labor','Production capacity','Equipment / maintenance','Quality / food safety','Regulatory','Cyber / OT','Customer demand','Growth opportunity']])+'''
## Freshness and provenance

Eligibility requires reviewed status, known source references, valid factors, a causal path, nonfuture evidence, and a current assessment expiry. Source fetch staleness is visible separately; a fetch error does not retroactively invalidate a dated primary observation. Reviews must expire at an appropriate horizon and cannot refresh the source date merely by saving a judgment.

Yesterday means the actual previous calendar-day snapshot. No nearest-day substitution, synthetic trend or backfilled score is allowed. 30/90/365-day views grow from recorded assessments. Public repository baseline history and private analyst history are stored separately to avoid mixing incompatible score series.

Dynamic personas are selected from highest-priority distinct issue groups with unique decision roles. Source dates, prior revisions and score changes determine NEW ISSUE, CHANGED GUIDANCE, GUIDANCE STABLE or IMPROVING. Unknown publication date does not become NEW ISSUE on retrieval day.

## Prediction evaluation

Every forecast stores immutable initial probability, measurable question, observation horizon, resolution deadline, confidence, supporting indicators and resolution rule. Keep delayed/missing outcomes unresolved. Close the full observation window before resolution, and require public resolution evidence. Brier = (p − y)²; report resolved sample size, calibration bins and false positives/negatives at p ≥ 0.5. Do not report performance on unresolved forecasts.

Review high-error forecasts monthly by mechanism, source concentration and stale signals; change versioned scoring anchors or priors only with written rationale. A source-volume cap alone is not calibration. Track stale indicators, source concentration, missed confirmed events and over/underweighted signals in the calibration review ledger.
''')
write('failure-domains.md','# F. Failure-domain map\n\n'+head+table(['Domain','Shared failure pathway','Verify'],[(f['name']+' · '+f['evidenceClass'],f['path'],f['verify']) for f in read('failure-domains')])+'''
## Failure Domain Correlation Score

For each candidate alternative, record nonnegative shared-dependency loadings and an independent residual; use positive capacity/importance weights. Normalize vectors and calculate pairwise cosine correlation. This Gram construction yields a positive semidefinite correlation matrix R. Correlation score = 100 × weighted mean off-diagonal correlation.

Equivalent independent count N_eff = (Σw)² / (wᵀRw). For equal independent alternatives N_eff=N; for fully shared alternatives N_eff=1. Unequal independent weights yield less than nominal N. Unknown dependency relationships produce a range [1, weighted independent count], not a fabricated zero correlation.

The dashboard's three-alternative illustration changes only A/B shared crop exposure; C is independent by scenario assumption. It is not an assessment of actual Watershed suppliers. Operational redundancy additionally requires qualified materials, approved specifications, available spare capacity, lead times and logistics fit. Substituting food ingredients requires Quality/customer approval, allergen and label review and process validation as applicable.
''')
write('ingredient-exposure.md','# G. Ingredient/category exposure model\n\n'+head+table(['Category / class','Capability basis','Hypothesized geography','Dependency and causal path'],[(x['ingredient']+' · '+x['evidenceClass'],x['basis']+' '+refs(x['sourceIds']),x['geography'],x['dependencies']+'. '+x['pathway']) for x in read('exposures')])+'''
All spend shares and volumes are null. Do not infer current purchases from a capability advertisement. Link actual vendor/product, ingredient specification, crop origin, safety qualification, lead time, contracts, inventory cover and approved substitutes only after evidence is supplied. Dairy-price shocks affect margin only through actual formula contribution, yield and pass-through; broad crop stress affects availability only through verified origin and timing.
''')
write('customer-demand.md','# H. Customer-demand and opportunity model\n\n'+head+table(['Archetype','Platform fit','Upside mechanism','Downside mechanism','Monitor'],[(d['name'],d['platforms'],d['upside'],d['downside'],d['monitor']) for d in read('demand')])+'''
No individual current customer is verified. Historical Kellogg reporting remains historical. Capability overlap is a prospecting hypothesis, never an account assertion. Watershed's actual mix is unknown, so this model cannot rank category growth relative to its current sales mix yet.

Opportunity qualification: primary demand evidence → customer problem → process/platform fit → technically feasible formulation/format → qualified commercial brief → capacity, safety, specification and margin review. Track qualified briefs and conversion, not just media volume. Public industry spend projections are not orders or premium-unit growth.

'''+ '\n\n'.join(f"## {s['title']}\n\n{s['summary']}\n\nVerify: {s['verify']}\n\nAction: {s['action']}\n\nTrigger: {s['trigger']}\n\n{s['confidence']} confidence; {s['evidenceClass']} impact. {refs(s['sourceIds'])}" for s in read('signals') if s['direction']=='Opportunity'))
write('competitor-watchlist.md','# I. Competitor and capacity watchlist\n\n'+head+table(['Company','Overlap / evidence','Capacity status','Monitoring trigger / citation'],[(c['name'],c['overlap']+' · '+c['evidenceClass'],c['capacityStatus'],c['watch']+' '+refs(c['sourceIds'])) for c in read('competitors')])+'''
The watchlist records capability overlap only, not a measured market-share estimate. Distinguish announcement, permit, construction, commissioning, available throughput and utilization. Track closure/bankruptcy evidence only from official filings or high-quality sourced reporting. A freeze-drying acquisition may reduce independent alternatives: Thrive/Mercer are grouped rather than double counted. Pet extrusion is not silently relabeled oven baking. Competitor facilities are never used to locate Watershed's unspecified Wisconsin site.
''')
write('review.md','''# Internal analytical review — 17 September 2026

This is an internal quality record. Occupational lenses guide analysis; they are not claims that licensed professionals signed off on food safety, legal compliance or company operations. These reviewers are not dashboard personas.

| Lens / O*NET reference | Challenge | Correction made |
| --- | --- | --- |
| [Intelligence Analyst](https://www.onetonline.org/link/summary/33-3021.06) | Related-company contact addresses and retrieval dates upgraded into current site facts | Re-routed entity edges; Congerville allocation inferred; separate event/retrieval dates; APPA event date unknown |
| [Operations Research Analyst](https://www.onetonline.org/link/summary/15-2031.00) | Multiplicative attenuation, invalid correlation inputs, category/domain conflation | Added anchors and urgent override; rejected negative/nonfinite dependency inputs; separated impact domains |
| [Logistician](https://www.onetonline.org/link/summary/13-1081.00) | Nominal vendor count mistaken for operating redundancy | Marked scenario assumptions; spare capacity, approval and lead times remain prerequisites |
| [Industrial Engineer](https://www.onetonline.org/link/summary/17-2112.00) | Proposed machinery mistaken for commissioned capacity | Proposed lines remain historical; throughput/utilization null |
| [Food Scientist](https://www.onetonline.org/link/summary/19-1012.00) | Toddler lead guidance and traceability overgeneralization | Preserved product-form exclusions, nonbinding guidance and proposed/non-enforcement distinction; no safety clearance inferred |
| [Information Security Analyst](https://www.onetonline.org/link/summary/15-1212.00) | Concurrent resolution overwrite, unvalidated review objects, older feed overwrites | Conditional atomic record/audit writes; input validation; newer-only feed states; durable reviews loaded separately |
| [Emergency Management Director](https://www.onetonline.org/link/summary/11-9161.00) | Low numerical velocity suppresses verified urgent issues | Explicit evidenced High/Critical override, without changing materiality |

Additional corrections: removed diesel evidence from dairy hypothesis; resolved hypothesis citation IDs; selected unique roles across distinct issue groups; source retrieval date remains independent of review date; forecast window must fully close before resolution. Review references retrieved 2026-09-17.

Remaining limits: private business exposure is unknown; factors/thresholds are provisional, not empirically calibrated; many catalog pages use change detection and require interpretation; publication does not validate all source endpoints or certify the company. Browser preview was unavailable in the provided environment; model, parser, validation, database and production-build checks are recorded separately.
''')
write('regulatory-scope.md','''# Regulatory applicability review

Public capability claims justify an applicability review, not a determination that every rule applies to every product/site. Primary references retrieved 2026-09-17:

- [21 CFR Part 117](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-117): human-food manufacturing cGMP and preventive-control applicability/exemptions.
- [21 CFR Part 507](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-E/part-507): animal-food cGMP and preventive-control scope.
- [21 CFR Part 111](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-111): human dietary-supplement manufacturing, packaging, labeling and holding, when the product classification makes it applicable.
- [FDA Animal Foods & Feeds](https://www.fda.gov/animal-veterinary/products/animal-foods-feeds): DSHEA does not create an animal dietary-supplement category. Intended use can determine animal-food versus new-animal-drug classification; do not apply human supplement assumptions to pet products.
- [FDA FSVP](https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-foreign-supplier-verification-programs-fsvp-importers-food-humans-and-animals): importer-specific responsibilities; importing is not established merely from international marketing.
- [FDA traceability](https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-requirements-additional-traceability-records-certain-foods): distinguish proposed date extension from Congressional non-enforcement direction; identify listed food, form and exemptions.
- [FDA January 2025 lead guidance](https://www.fda.gov/media/164684/download): nonbinding guidance excludes specified snack forms including freeze-dried snacks. Exclusion neither proves product safety nor removes other obligations/customer specifications.

Review allergen declarations/cross-contact, labels, registration, sanitation, validation, state food licenses, infant/toddler versus conventional versus supplement classification, and pet-food labeling against actual site/product activities. Verify SQF/GFSI certificate scope and expiry with the issuer; a company marketing statement does not establish an independently verified current certificate.
''')
print('Generated maintained A–I deliverables, regulatory scope and review record.')

# Additional maintained deliverables: public measurements and explicit best-guess facility models.
benchmarks=read('benchmarks');guesses=read('facility-hypotheses');gaps=read('coverage-gaps');geo=read('osm-context')
facility_names={f['id']:f['name'] for f in facilities}
write('coverage-expansion.md','# OSINT coverage expansion · 17 September 2026\n\n'+'''The executive model now has conditional assessments in **11 of 12 domains**, up from five. Cyber / OT remains unassessed because no installed product/version inventory is established. Overall posture remains **Elevated, provisional: 47/100**, led by diesel. More assessed domains do not mean that company exposure or financial impact is measured.

Collection repairs increased successful latest fetches from 21 to 57. The registry now contains 83 sources: 57 successful latest fetches, 17 blocked/error endpoints, and nine manual/key-required sources at this review. Manual reads can support evidence while automated retrieval remains blocked. Generic page retrieval is discovery coverage, not automatic interpretation of every indicator.

## What the added evidence changes

- Ingredient costs are mixed: August grain/oilseed benchmarks rose while dairy eased. Do not net these into a company basket without actual weights.
- Packaging benchmarks diverge: paperboard increased; monthly resin/film changes eased. The film category is broader than food packaging.
- The latest published Illinois industrial electricity average was 10.4% above its year-earlier month; Wisconsin was 3.4% higher. These lagged June averages are not actual facility tariffs.
- Metro labor series provide hiring context, not proof of a Watershed shortage. Seasonal adjustment, geography and preliminary status are explicit.
- General Mills is a global CPG archetype proxy, not an identified customer. Its guidance does not determine Watershed orders.
- EIA's attributed export/distillate scenario supports the existing fuel pathway. S13 and S01 share one issue group and do not create additive geopolitical losses.

## Reviewed public benchmark ledger

Values below are public measurements. Company applicability is inferred. The reference period is not the retrieval date. All records were reviewed/retrieved September 17. Exact labor release days remain unverified.

'''+table(['Benchmark / geography','Value / unit','Comparison / adjustment','Reference / release','Source'],[(b['label']+' / '+b['geography'],str(b['value'])+' '+b['unit'],b['comparison']+'; monthly/current '+b['seasonalAdjustment']+(('; year-over-year '+str(round(b['yearOverYear'],3))+'% NSA') if b.get('yearOverYear') is not None else ''),b['referencePeriod']+' / '+str(b.get('releaseDate') or 'exact day unverified'),refs([b['sourceId']])) for b in benchmarks])+'''
## Facility best guesses

The user requested useful representations based on OSINT and standard expectations when precise operating data is unavailable. These hypotheses describe plausible ingredient/equipment categories and dependencies; they do not assert purchases, suppliers, recipes, installed models, quantities or capacity. Confidence is qualitative. Alternatives and falsification steps prevent repetition from turning a guess into fact.

'''+ '\n\n'.join('### '+h['id']+' · '+facility_names[h['facilityId']]+' · '+h['area']+'\n\n**INFERRED · '+h['confidence']+' confidence.**\n\n'+ '; '.join(h['items'])+'.\n\nBasis: '+h['basis']+'\n\nAlternative: '+h['alternative']+'\n\nVerify or disprove: '+h['verify']+'\n\n'+refs(h['sourceIds']) for h in guesses)+'''

## OpenStreetMap context

The facility views show selected major roads and main rail from two fixed regional extracts. All five markers are municipality references, not plant geocodes. Milwaukee is only a reference city for the publicly described greater-Milwaukee operation. The extracts omit many local roads and branch rail; they cannot establish legal truck access, current conditions, actual carrier routes or effective redundancy.

Nearby I-74 mapping supports a possible shared-corridor hypothesis for Congerville and Deer Creek, subject to actual route verification. It does not establish a shared shipping lane or add a numerical risk score. Distances displayed in the dashboard are approximate straight-line distances from town/city reference points to simplified geometry, not plant or driving distances.

'''+table(['Reference','Precision','OSM object'],[(p['displayName'],p['precision'],f"[{p['name']}]({p['url']})") for p in geo['places']])+'''
© OpenStreetMap contributors. Geographic data is available under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/); retain [attribution and usage notes](../data/OSM-LICENSE.md). Fixed queries, object IDs, dates and portable geometry are in [`data/osm-context.json`](../data/osm-context.json). Cached, rate-limited municipality lookups are not offered as a generic live geocoding service.

## Remaining gaps and how to close them

'''+ '\n\n'.join('### '+g['id']+' · '+g['topic']+'\n\n**'+g['status']+'.** '+g['currentBasis']+'\n\nPublic next step: '+g['publicNextStep']+'\n\nCompany verification: '+g['internalVerification']+'\n\nInterpretation limit: '+g['boundary']+'\n\n'+refs(g['sourceIds']) for g in gaps)+'''

## Maintaining the distinction

Public benchmark parsers preserve exact series, units, comparison periods, seasonal adjustment and preliminary status. They produce unreviewed candidates. Mapping changes likewise enter review before replacing a saved map. Monthly corridor checks do not repeatedly call Nominatim. No automatic collection promotes a best guess to confirmed company fact.

The private professional review corrected the PPI annual adjustment labels, broad film/maintenance categories, Illinois roasting allocation and the interpretation of public recruiting links. Human and pet supplement classifications remain separate. Original forecast probabilities are unchanged; open forecasts are not scored as successful. The live source-health view and next dated review supersede the static counts in this document.
''')
