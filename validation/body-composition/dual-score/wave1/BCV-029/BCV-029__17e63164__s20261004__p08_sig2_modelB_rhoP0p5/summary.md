# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.0755 | 3.1434 | 0.4969 | 2.5361 |
| perf | 22.8750 | 120000 | true | 0.9353 | 8.1611 | 0.2381 | 7.8342 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7213, H2=0.0654, H3=0.2133
- perf: P1=1.1097, P3=-0.1097

No product bands, no clinical claims. Synthetic fallback parameters only.
