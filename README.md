# Watershed External Intelligence

A persistent, public-evidence intelligence system for Watershed Foods. It connects company ground truth, four processing platforms, facilities, ingredient hypotheses, customer archetypes and shared failure domains to an executive decision workspace.

**Research baseline: 17 September 2026.** No current named customers, actual suppliers, spend mix, installed OT stack or operational redundancy are asserted without evidence. Scores are transparent provisional analyst priorities, not measured financial exposure.

## Run and verify

Requires Node 22.13+ and the included pnpm lockfile.

```sh
corepack pnpm install --frozen-lockfile
node --test tests/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run db:generate
npm run build
npm run dev
```

Sites uses `.openai/hosting.json`, the starter's build plugin and schema-only Drizzle migrations to provision persistent D1 storage. Apply the generated migration to the local DB before testing persistence. Never add runtime schema creation, secrets or private analyst exports to this public repository.

## Deliverables

| | Maintained artifact |
| --- | --- |
| A | [Company Ground Truth dossier](docs/company-ground-truth.md) |
| B | [Facility and capability graph](docs/facility-capability-graph.md) |
| C | [Supply-chain ontology](docs/supply-chain-ontology.md) |
| D | [Source catalog and refresh cadence](docs/source-catalog.md) |
| E | [External Risk Equation](docs/risk-methodology.md) |
| F | [Failure-domain map](docs/failure-domains.md) |
| G | [Ingredient/category exposure model](docs/ingredient-exposure.md) |
| H | [Customer-demand and opportunity model](docs/customer-demand.md) |
| I | [Competitor/capacity watchlist](docs/competitor-watchlist.md) |

The same data is browsable in the executive workspace. JSON under `data/` is the portable evidence model. [Regulatory scope](docs/regulatory-scope.md) and the [internal review record](docs/review.md) explain important limits.

## Persistent operation

- The GitHub Actions collector runs hourly and on workflow changes, respecting 72 source-specific cadences. Scheduled jobs can be delayed by GitHub; inactivity may disable schedules in public repositories. Confirm runs in Actions and use manual dispatch if needed.
- Structured adapters cover NWS, FDA enforcement, Federal Register and CISA KEV. Page adapters record changes for analyst review; they do not parse every commodity release into reliable numeric observations. API-key/manual sources remain explicit gaps.
- Public observations, fetch errors, content hashes and genuine baseline history persist in `data/runtime/latest.json` via normal commits. A blocked endpoint is not treated as no risk.
- The private Site stores reviewed assessments, claims/citations, hypotheses, forecast resolutions, local snapshots and audit records in D1. The dashboard synchronizes the public feed on opening when its last synchronization is over an hour old; **Sync repository** also runs it on demand. It imports public observations, reviewed public claims/assessments and separate public history; private reviews take precedence. **Check due sources** checks up to 12 due endpoints per invocation.
- Scheduled analyst review maintains the public model separately from automatic discovery. It must verify primary sources before changing a score, retain dates/evidence classes, falsify hypotheses and resolve forecasts only after the measurement window closes.
- Private analyst notes are not automatically written to this public GitHub repository. Export the workspace deliberately for a portable backup.

## Analyst workflow

1. Check source health and review queue. Verify the observation's release date, geography, units and applicability.
2. Trace the causal pathway through an evidenced capability and explicitly uncertain exposure.
3. Publish a reviewed assessment with all seven factors, rationale, impact domains, decision owners, expiry and escalation trigger.
4. Record internal verification needs without asserting private details as public facts.
5. Review hypotheses; fixed initial forecast probabilities are evaluated using Brier scores after supported resolution.
6. Review misses, stale indicators, source concentration and over/underweighted signals monthly in `data/calibration-reviews.json`; version methodology changes.

Generate dossier documents after editing the maintained JSON:

```sh
python scripts/build-docs.py
```

`seed-data.py` is the reproducible initial research seed, not a refresh script. Do not run it over maintained data. If deliberately reconstructing the original baseline, follow it with `refine-baseline.py` and `build-docs.py` to retain red-team corrections.

## Security and evidence boundaries

The hosted workspace is intended to remain owner-private. Platform identity protects APIs; mutation requests require same-origin checks. Local development authorization is compiled out of production. Do not broaden Site access without reviewing who may see/edit all workspace records. Fetch targets come from the checked-in source catalog, with no user-supplied target fetching, redirect following or source-content execution.

No sensitive facility-security details, private workforce information or inferred installed systems are collected. Urgent safety/continuity response is a separate evidenced override: a low multiplicative score is never operational clearance.

## Known baseline gaps

Browser visual QA was unavailable in the provided preview environment. All implemented monitoring adapters are failure-visible, but a source catalog is broader than fully automated semantic coverage. Current business exposure, full historical trends, empirical calibration and verified operating redundancy require future evidence. The dashboard displays those gaps instead of fabricated numbers.
