# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2930 | 0.8494 | 0.4974 | 0.1877 |
| perf | 22.8750 | 120000 | true | 0.2381 | 2.0632 | 0.2781 | 0.5141 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5927, H2=0.0594, H3=0.3479
- perf: P1=1.0754, P3=-0.0754

No product bands, no clinical claims. Synthetic fallback parameters only.
