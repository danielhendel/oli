# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 1.0521 | 2.9204 | 0.4990 | 2.2680 |
| perf | 70.0000 | 250000 | true | 0.5816 | 2.3002 | 0.5002 | 1.0461 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8771, H2=0.1230, H3=-0.0000
- perf: P1=-0.0215, P3=1.0215

No product bands, no clinical claims. Synthetic fallback parameters only.
