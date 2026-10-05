# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 0.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3463 | 1.0075 | 0.5024 | 0.2644 |
| perf | 45.1316 | 120000 | true | 0.4745 | 1.3997 | 0.4978 | 0.4973 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6867, H2=0.0211, H3=0.2922
- perf: P1=1.1890, P3=-0.1890

No product bands, no clinical claims. Synthetic fallback parameters only.
