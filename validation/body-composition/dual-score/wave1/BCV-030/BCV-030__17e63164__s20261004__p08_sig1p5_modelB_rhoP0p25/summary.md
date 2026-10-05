# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 1.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.8397 | 2.4445 | 0.4965 | 1.5474 |
| perf | 22.8750 | 120000 | true | 0.7157 | 6.2872 | 0.2779 | 4.7493 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6642, H2=0.0783, H3=0.2575
- perf: P1=1.0754, P3=-0.0754

No product bands, no clinical claims. Synthetic fallback parameters only.
