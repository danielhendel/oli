# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.0395 | 3.0255 | 0.4930 | 2.3664 |
| perf | 22.8750 | 120000 | true | 0.9760 | 8.9523 | 0.3833 | 10.2202 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7808, H2=0.0306, H3=0.1886
- perf: P1=0.9697, P3=0.0303

No product bands, no clinical claims. Synthetic fallback parameters only.
