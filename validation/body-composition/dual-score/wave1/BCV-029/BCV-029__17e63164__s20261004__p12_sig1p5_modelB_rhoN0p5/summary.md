# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 1.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 310000 | true | 1.0419 | 3.0004 | 0.5005 | 2.3551 |
| perf | 45.1316 | 120000 | true | 1.7792 | 6.0178 | 0.4970 | 8.7614 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6785, H2=0.0215, H3=0.2999
- perf: P1=0.9763, P3=0.0237

No product bands, no clinical claims. Synthetic fallback parameters only.
