# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2919 | 0.8453 | 0.5014 | 0.1864 |
| perf | 22.8750 | 120000 | true | 0.2416 | 2.1407 | 0.3413 | 0.5740 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5946, H2=0.0592, H3=0.3462
- perf: P1=1.0168, P3=-0.0168

No product bands, no clinical claims. Synthetic fallback parameters only.
