# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 1
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 130000 | true | 0.6733 | 1.9573 | 0.4999 | 0.9947 |
| perf | 45.1316 | 120000 | true | 0.8778 | 2.9040 | 0.4977 | 2.0084 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7272, H2=-0.0078, H3=0.2807
- perf: P1=1.2745, P3=-0.2745

No product bands, no clinical claims. Synthetic fallback parameters only.
