# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 190000 | true | 1.4071 | 4.0507 | 0.4999 | 4.3100 |
| perf | 45.1316 | 120000 | true | 2.2375 | 7.8760 | 0.4988 | 14.7555 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6372, H2=0.0439, H3=0.3188
- perf: P1=1.0581, P3=-0.0581

No product bands, no clinical claims. Synthetic fallback parameters only.
