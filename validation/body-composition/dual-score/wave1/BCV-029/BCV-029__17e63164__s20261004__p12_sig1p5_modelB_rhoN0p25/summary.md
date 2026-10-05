# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 1.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 270000 | true | 1.0615 | 3.0493 | 0.5006 | 2.4377 |
| perf | 45.1316 | 120000 | true | 1.7047 | 5.7540 | 0.4966 | 8.0550 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6550, H2=0.0387, H3=0.3063
- perf: P1=1.0163, P3=-0.0163

No product bands, no clinical claims. Synthetic fallback parameters only.
