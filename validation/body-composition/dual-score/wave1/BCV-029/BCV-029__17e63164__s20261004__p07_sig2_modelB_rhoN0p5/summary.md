# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.9360 | 2.7212 | 0.5019 | 1.9278 |
| perf | 52.6377 | 200000 | true | 1.8581 | 5.3779 | 0.5015 | 7.5373 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5360, H2=0.0144, H3=0.4496
- perf: P1=1.0105, P3=-0.0105

No product bands, no clinical claims. Synthetic fallback parameters only.
