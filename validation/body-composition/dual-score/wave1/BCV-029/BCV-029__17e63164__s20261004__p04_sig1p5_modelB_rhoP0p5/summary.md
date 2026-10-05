# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 140000 | true | 0.8067 | 2.2046 | 0.4986 | 1.3102 |
| perf | 70.0000 | 140000 | true | 0.4390 | 1.7430 | 0.5001 | 0.5923 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8817, H2=0.1183, H3=-0.0000
- perf: P1=-0.0217, P3=1.0217

No product bands, no clinical claims. Synthetic fallback parameters only.
