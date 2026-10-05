# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 1.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.7845 | 2.2847 | 0.4967 | 1.3476 |
| perf | 22.8750 | 120000 | true | 0.7240 | 6.6894 | 0.3834 | 5.7494 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7587, H2=0.0179, H3=0.2234
- perf: P1=0.9691, P3=0.0309

No product bands, no clinical claims. Synthetic fallback parameters only.
