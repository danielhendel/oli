# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.8717 | 2.5525 | 0.4997 | 1.6864 |
| perf | 52.6377 | 240000 | true | 1.9038 | 5.5464 | 0.5008 | 7.9704 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6081, H2=-0.0496, H3=0.4415
- perf: P1=0.9828, P3=0.0172

No product bands, no clinical claims. Synthetic fallback parameters only.
