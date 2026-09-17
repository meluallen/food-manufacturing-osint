# F. Failure-domain map

Baseline researched 17 September 2026. Every relationship retains its evidence class. Current public evidence does not establish actual customer mix, purchasing, recipes, installed OT, utilization, contracts or inventories.

| Domain | Shared failure pathway | Verify |
| --- | --- | --- |
| Common crop origin · INFERRED | Two fruit vendors → same growing region → same drought/freeze | Tier-2 origin by crop, season and lot; supplier names are not evidence of diversification. |
| Packaging feedstock · INFERRED | Two converters → same resin/mill → shared capacity constraint | Resin producer, resin grade, backup tooling, converter and mill allocation. |
| Transport chokepoint · INFERRED | Two import origins → common port/canal/carrier → correlated delays | Actual port pairs, service strings, transshipment, inland rail corridor. |
| Regional operating footprint · INFERRED | Central Illinois facilities → overlapping weather/labor region | Facility overlap is public; utilities, labor pools and incident impact correlation require validation. |
| Digital and equipment dependency · INFERRED | Production / ERP / recovery → common identity or vendor service | Authorized internal inventory and recovery tests. No public identification of installed systems is assumed. |
| Shared public recruiting provider · INFERRED | Two company-linked application portals → same Paycom public recruiting domain → potential common application-access dependency | Verify recruiting continuity with authorized HR/IT. Do not infer payroll, HRIS, identity or ERP use. Provider-level correlation and effective redundancy remain unmeasured. |
| Potential shared Central Illinois highway corridor · INFERRED | Congerville and Deer Creek regional road context → potential I-74 routing overlap → correlated transport disruption if routes are shared | Check actual origin/destination lanes and carrier routing. Nearby mapped highways do not prove use or redundancy; no quantified company correlation is assigned. |

## Failure Domain Correlation Score

For each candidate alternative, record nonnegative shared-dependency loadings and an independent residual; use positive capacity/importance weights. Normalize vectors and calculate pairwise cosine correlation. This Gram construction yields a positive semidefinite correlation matrix R. Correlation score = 100 × weighted mean off-diagonal correlation.

Equivalent independent count N_eff = (Σw)² / (wᵀRw). For equal independent alternatives N_eff=N; for fully shared alternatives N_eff=1. Unequal independent weights yield less than nominal N. Unknown dependency relationships produce a range [1, weighted independent count], not a fabricated zero correlation.

The dashboard's three-alternative illustration changes only A/B shared crop exposure; C is independent by scenario assumption. It is not an assessment of actual Watershed suppliers. Operational redundancy additionally requires qualified materials, approved specifications, available spare capacity, lead times and logistics fit. Substituting food ingredients requires Quality/customer approval, allergen and label review and process validation as applicable.
