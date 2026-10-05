# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2724 | 0.7925 | 0.5000 | 0.1625 |
| perf | 22.8750 | 120000 | true | 0.2410 | 2.2143 | 0.3870 | 0.6293 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6893, H2=-0.0123, H3=0.3230
- perf: P1=0.9680, P3=0.0320

No product bands, no clinical claims. Synthetic fallback parameters only.
