# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 1.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 260000 | true | 1.0082 | 2.9040 | 0.4992 | 2.2068 |
| perf | 45.1316 | 120000 | true | 1.8431 | 6.2084 | 0.4974 | 9.3264 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7227, H2=-0.0091, H3=0.2864
- perf: P1=0.9452, P3=0.0548

No product bands, no clinical claims. Synthetic fallback parameters only.
