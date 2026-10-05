# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 180000 | true | 1.3423 | 3.8392 | 0.5001 | 3.8826 |
| perf | 45.1316 | 120000 | true | 1.8667 | 6.9318 | 0.4976 | 11.2223 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7156, H2=-0.0105, H3=0.2949
- perf: P1=1.2423, P3=-0.2423

No product bands, no clinical claims. Synthetic fallback parameters only.
