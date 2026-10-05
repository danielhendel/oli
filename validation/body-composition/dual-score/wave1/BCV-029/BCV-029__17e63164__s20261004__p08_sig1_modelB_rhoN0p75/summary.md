# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 1
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.5331 | 1.5478 | 0.4991 | 0.6219 |
| perf | 22.8750 | 120000 | true | 0.4831 | 4.4524 | 0.3871 | 2.5392 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7286, H2=0.0011, H3=0.2703
- perf: P1=0.9683, P3=0.0317

No product bands, no clinical claims. Synthetic fallback parameters only.
