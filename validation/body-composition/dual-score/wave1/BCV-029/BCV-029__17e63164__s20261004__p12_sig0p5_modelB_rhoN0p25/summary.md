# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 0.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3543 | 1.0295 | 0.5012 | 0.2753 |
| perf | 45.1316 | 120000 | true | 0.5585 | 1.6283 | 0.4966 | 0.6800 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6619, H2=0.0375, H3=0.3006
- perf: P1=1.0021, P3=-0.0021

No product bands, no clinical claims. Synthetic fallback parameters only.
