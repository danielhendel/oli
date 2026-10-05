# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 1.3451 | 3.8452 | 0.4994 | 3.8804 |
| perf | 45.1316 | 120000 | true | 2.5038 | 8.7869 | 0.4980 | 18.3398 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7148, H2=-0.0120, H3=0.2972
- perf: P1=0.9505, P3=0.0495

No product bands, no clinical claims. Synthetic fallback parameters only.
