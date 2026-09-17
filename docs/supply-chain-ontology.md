# C. Supply-chain ontology

Baseline researched 17 September 2026. Every relationship retains its evidence class. Current public evidence does not establish actual customer mix, purchasing, recipes, installed OT, utilization, contracts or inventories.

| Node type | Meaning |
| --- | --- |
| Company | Legal or public operating entity; ownership is a separate evidenced edge. |
| Business Unit | Advertised division or related business; not automatically a legal subsidiary. |
| Facility | Public operating presence, contact address or regional location with precision explicitly recorded. |
| Process | Evidence-qualified model node; actual deployment/use must be separately established. |
| Production Line | Historical proposal unless actual installation/commissioning is documented. |
| Product Domain | Evidence-qualified model node; actual deployment/use must be separately established. |
| Ingredient Class | Evidence-qualified model node; actual deployment/use must be separately established. |
| Packaging | Evidence-qualified model node; actual deployment/use must be separately established. |
| Utility | Evidence-qualified model node; actual deployment/use must be separately established. |
| Equipment | Evidence-qualified model node; actual deployment/use must be separately established. |
| Transportation Mode | Evidence-qualified model node; actual deployment/use must be separately established. |
| Supplier Geography | Hypothesized sourcing region; never inferred from category alone as actual origin. |
| Customer Segment | Archetype rather than a named account. |
| Regulatory Requirement | Evidence-qualified model node; actual deployment/use must be separately established. |
| External Risk | Causal risk category, not evidence of a current incident. |

Graph paths connect company → business unit → facility → process → proposed production line → product domain → potential ingredient inputs → packaging/equipment/utility needs and transport/origin hypotheses → customer archetypes → regulatory applicability → external risk.

This is a directed multigraph, not a mandatory single chain: electricity supports equipment; crop origin determines agricultural exposure; food form determines regulation; customers and processes have many-to-many links. A traversed path is no stronger than its least established edge. An inferred edge cannot upgrade a downstream entity or claim.

Required edge fields: stable ID, source, target, relation, evidenceClass, sourceIds, note, asOf, retrievedAt and evidenceDate. Production capacity is null until measured; absence of a public link is not evidence of independence.

Ownership, buys-from, sells-to, site allocation, certified-by and shares-failure-domain are distinct relations. Require direct evidence to add named procurement/account links. Keep dates and attribution limits with the edge.
