# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 1
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.5725 | 1.6630 | 0.4977 | 0.7177 |
| perf | 22.8750 | 120000 | true | 0.4775 | 4.1619 | 0.2780 | 2.0886 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6257, H2=0.0681, H3=0.3062
- perf: P1=1.0758, P3=-0.0758

No product bands, no clinical claims. Synthetic fallback parameters only.
