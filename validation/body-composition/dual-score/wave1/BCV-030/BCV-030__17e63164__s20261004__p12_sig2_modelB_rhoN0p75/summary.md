# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 190000 | true | 1.3414 | 3.8376 | 0.5004 | 3.8673 |
| perf | 45.1316 | 120000 | true | 2.5174 | 8.7863 | 0.4971 | 18.3875 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7146, H2=-0.0115, H3=0.2969
- perf: P1=0.9501, P3=0.0499

No product bands, no clinical claims. Synthetic fallback parameters only.
