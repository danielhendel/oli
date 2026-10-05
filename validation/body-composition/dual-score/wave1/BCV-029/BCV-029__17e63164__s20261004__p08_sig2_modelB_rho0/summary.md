# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.1088 | 3.2607 | 0.4966 | 2.7198 |
| perf | 22.8750 | 150000 | true | 0.9609 | 8.4614 | 0.3133 | 8.7729 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6793, H2=0.0920, H3=0.2287
- perf: P1=1.0443, P3=-0.0443

No product bands, no clinical claims. Synthetic fallback parameters only.
