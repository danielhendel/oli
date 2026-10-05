# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 1.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.7841 | 2.2826 | 0.4962 | 1.3473 |
| perf | 22.8750 | 120000 | true | 0.7035 | 6.0289 | 0.1772 | 4.1779 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7603, H2=0.0174, H3=0.2223
- perf: P1=1.1487, P3=-0.1487

No product bands, no clinical claims. Synthetic fallback parameters only.
