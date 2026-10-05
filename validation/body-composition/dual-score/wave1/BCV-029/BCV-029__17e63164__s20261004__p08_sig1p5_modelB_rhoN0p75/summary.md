# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 1.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.7824 | 2.2909 | 0.4961 | 1.3481 |
| perf | 22.8750 | 120000 | true | 0.7206 | 6.7042 | 0.3870 | 5.7693 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7604, H2=0.0170, H3=0.2225
- perf: P1=0.9681, P3=0.0319

No product bands, no clinical claims. Synthetic fallback parameters only.
