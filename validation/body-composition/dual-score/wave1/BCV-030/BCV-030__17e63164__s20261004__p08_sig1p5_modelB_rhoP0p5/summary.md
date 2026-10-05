# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 1.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.8152 | 2.3878 | 0.4957 | 1.4694 |
| perf | 22.8750 | 120000 | true | 0.7075 | 6.1503 | 0.2359 | 4.4638 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6979, H2=0.0578, H3=0.2443
- perf: P1=1.1098, P3=-0.1098

No product bands, no clinical claims. Synthetic fallback parameters only.
