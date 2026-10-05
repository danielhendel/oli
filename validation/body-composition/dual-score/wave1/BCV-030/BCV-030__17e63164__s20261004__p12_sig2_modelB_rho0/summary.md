# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 210000 | true | 1.4155 | 4.0793 | 0.4996 | 4.3444 |
| perf | 45.1316 | 140000 | true | 2.2456 | 7.9022 | 0.4989 | 14.7659 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6394, H2=0.0446, H3=0.3160
- perf: P1=1.0594, P3=-0.0594

No product bands, no clinical claims. Synthetic fallback parameters only.
