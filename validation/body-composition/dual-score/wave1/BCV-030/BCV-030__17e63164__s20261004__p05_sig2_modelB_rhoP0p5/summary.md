# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8049 | 2.3595 | 0.4991 | 1.4416 |
| perf | 51.0000 | 180000 | true | 0.4489 | 4.6756 | 0.1897 | 4.0150 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7875, H2=0.1680, H3=0.0445
- perf: P1=0.8496, P3=0.1504

No product bands, no clinical claims. Synthetic fallback parameters only.
