# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.0787 | 3.1604 | 0.4954 | 2.5513 |
| perf | 22.8750 | 130000 | true | 0.9644 | 8.7854 | 0.3655 | 9.7488 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7212, H2=0.0639, H3=0.2149
- perf: P1=0.9916, P3=0.0084

No product bands, no clinical claims. Synthetic fallback parameters only.
