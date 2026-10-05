# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 0.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3371 | 0.9817 | 0.4992 | 0.2504 |
| perf | 45.1316 | 120000 | true | 0.6052 | 1.7726 | 0.4977 | 0.8074 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7284, H2=-0.0088, H3=0.2803
- perf: P1=0.9267, P3=0.0733

No product bands, no clinical claims. Synthetic fallback parameters only.
