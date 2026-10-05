# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5968 | 1.7403 | 0.5012 | 0.7891 |
| perf | 51.0000 | 150000 | true | 0.2317 | 2.4431 | 0.1349 | 1.4433 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8208, H2=0.1633, H3=0.0159
- perf: P1=0.7963, P3=0.2037

No product bands, no clinical claims. Synthetic fallback parameters only.
