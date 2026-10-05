# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 0.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2426 | 0.7041 | 0.5019 | 0.1296 |
| perf | 52.6377 | 120000 | true | 0.4499 | 1.3057 | 0.5027 | 0.4436 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4975, H2=0.0459, H3=0.4566
- perf: P1=1.0422, P3=-0.0422

No product bands, no clinical claims. Synthetic fallback parameters only.
