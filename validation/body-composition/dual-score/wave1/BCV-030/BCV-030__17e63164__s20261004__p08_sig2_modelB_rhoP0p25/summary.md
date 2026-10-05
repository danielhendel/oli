# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.1078 | 3.2396 | 0.4947 | 2.6904 |
| perf | 22.8750 | 120000 | true | 0.9451 | 8.3776 | 0.2779 | 8.3448 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6877, H2=0.0851, H3=0.2272
- perf: P1=1.0754, P3=-0.0754

No product bands, no clinical claims. Synthetic fallback parameters only.
