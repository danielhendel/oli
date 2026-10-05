# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 180000 | true | 0.8090 | 2.2025 | 0.4977 | 1.3137 |
| perf | 70.0000 | 320000 | true | 0.4396 | 1.7347 | 0.5000 | 0.5870 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8806, H2=0.1194, H3=0.0000
- perf: P1=-0.0264, P3=1.0264

No product bands, no clinical claims. Synthetic fallback parameters only.
