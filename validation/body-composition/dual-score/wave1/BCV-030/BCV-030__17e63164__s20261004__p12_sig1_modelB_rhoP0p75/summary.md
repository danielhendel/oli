# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 1
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 160000 | true | 0.6758 | 1.9584 | 0.4986 | 0.9996 |
| perf | 45.1316 | 120000 | true | 0.8804 | 2.9043 | 0.4973 | 2.0180 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7284, H2=-0.0081, H3=0.2797
- perf: P1=1.2733, P3=-0.2733

No product bands, no clinical claims. Synthetic fallback parameters only.
