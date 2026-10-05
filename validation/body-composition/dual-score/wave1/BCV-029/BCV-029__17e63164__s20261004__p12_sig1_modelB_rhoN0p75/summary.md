# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 1
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.6702 | 1.9445 | 0.4993 | 0.9860 |
| perf | 45.1316 | 120000 | true | 1.2160 | 3.8012 | 0.4975 | 3.6020 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7292, H2=-0.0079, H3=0.2787
- perf: P1=0.9335, P3=0.0665

No product bands, no clinical claims. Synthetic fallback parameters only.
