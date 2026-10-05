# BCV-030 — Aggregate uncertainty propagation

- persona: P-06 (male), sigma multiplier: 1.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.3814 | 120000 | true | 0.9137 | 2.6301 | 0.4988 | 1.8135 |
| perf | 85.5652 | 120000 | true | 1.4613 | 4.2324 | 0.4999 | 4.6347 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7033, H2=0.0000, H3=0.2967
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
