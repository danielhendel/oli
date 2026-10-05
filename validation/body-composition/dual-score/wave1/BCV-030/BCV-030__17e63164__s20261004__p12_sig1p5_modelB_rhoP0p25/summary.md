# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 1.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 130000 | true | 1.0610 | 3.0526 | 0.4979 | 2.4307 |
| perf | 45.1316 | 120000 | true | 1.5499 | 5.3568 | 0.4982 | 6.8352 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6536, H2=0.0389, H3=0.3075
- perf: P1=1.1098, P3=-0.1098

No product bands, no clinical claims. Synthetic fallback parameters only.
