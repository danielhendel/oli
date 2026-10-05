# BCV-030 — Aggregate uncertainty propagation

- persona: P-06 (male), sigma multiplier: 1.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.3814 | 120000 | true | 0.9124 | 2.6378 | 0.4996 | 1.8192 |
| perf | 85.5652 | 120000 | true | 1.4567 | 4.2449 | 0.4993 | 4.6218 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7016, H2=0.0000, H3=0.2984
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
