# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8056 | 2.3381 | 0.4986 | 1.4222 |
| perf | 51.0000 | 220000 | true | 0.3479 | 4.5043 | 0.1698 | 3.7541 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8037, H2=0.1604, H3=0.0358
- perf: P1=0.8779, P3=0.1221

No product bands, no clinical claims. Synthetic fallback parameters only.
