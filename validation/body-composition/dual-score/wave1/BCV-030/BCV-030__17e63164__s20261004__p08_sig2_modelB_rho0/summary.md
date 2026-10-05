# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.1136 | 3.2650 | 0.4961 | 2.7277 |
| perf | 22.8750 | 140000 | true | 0.9495 | 8.5220 | 0.3120 | 8.8567 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6790, H2=0.0917, H3=0.2292
- perf: P1=1.0440, P3=-0.0440

No product bands, no clinical claims. Synthetic fallback parameters only.
