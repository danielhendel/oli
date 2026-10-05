# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 1
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.5593 | 1.6101 | 0.4973 | 0.6788 |
| perf | 22.8750 | 120000 | true | 0.4737 | 4.0982 | 0.2361 | 1.9747 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6622, H2=0.0445, H3=0.2933
- perf: P1=1.1100, P3=-0.1100

No product bands, no clinical claims. Synthetic fallback parameters only.
