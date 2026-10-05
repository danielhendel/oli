# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 1
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.5541 | 1.5019 | 0.4990 | 0.6173 |
| perf | 70.0000 | 200000 | true | 0.2917 | 1.1859 | 0.5006 | 0.2707 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8875, H2=0.1125, H3=0.0000
- perf: P1=-0.0054, P3=1.0054

No product bands, no clinical claims. Synthetic fallback parameters only.
