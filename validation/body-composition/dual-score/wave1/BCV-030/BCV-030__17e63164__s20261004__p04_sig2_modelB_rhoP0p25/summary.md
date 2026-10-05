# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 150000 | true | 1.0458 | 2.9047 | 0.4983 | 2.2482 |
| perf | 70.0000 | 410000 | true | 0.5770 | 2.2837 | 0.4999 | 1.0284 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8783, H2=0.1217, H3=-0.0001
- perf: P1=-0.0304, P3=1.0304

No product bands, no clinical claims. Synthetic fallback parameters only.
