# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2929 | 0.8461 | 0.4991 | 0.1874 |
| perf | 22.8750 | 120000 | true | 0.2414 | 2.1470 | 0.3388 | 0.5772 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5918, H2=0.0579, H3=0.3502
- perf: P1=1.0154, P3=-0.0154

No product bands, no clinical claims. Synthetic fallback parameters only.
