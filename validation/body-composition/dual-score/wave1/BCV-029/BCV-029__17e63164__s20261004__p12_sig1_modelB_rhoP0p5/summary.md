# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 1
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.6928 | 2.0097 | 0.5023 | 1.0513 |
| perf | 45.1316 | 120000 | true | 0.9420 | 3.0282 | 0.4979 | 2.2554 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6838, H2=0.0228, H3=0.2934
- perf: P1=1.1848, P3=-0.1848

No product bands, no clinical claims. Synthetic fallback parameters only.
