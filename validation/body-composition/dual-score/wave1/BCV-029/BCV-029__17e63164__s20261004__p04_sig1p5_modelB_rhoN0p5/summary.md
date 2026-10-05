# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 160000 | true | 0.8105 | 2.2097 | 0.4984 | 1.3198 |
| perf | 70.0000 | 230000 | true | 0.4390 | 1.7715 | 0.4999 | 0.6111 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8804, H2=0.1196, H3=0.0000
- perf: P1=-0.0038, P3=1.0038

No product bands, no clinical claims. Synthetic fallback parameters only.
