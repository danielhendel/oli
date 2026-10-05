# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 1
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.7101 | 2.0617 | 0.5025 | 1.1101 |
| perf | 45.1316 | 120000 | true | 1.0737 | 3.3475 | 0.4968 | 2.8131 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6517, H2=0.0443, H3=0.3040
- perf: P1=1.0558, P3=-0.0558

No product bands, no clinical claims. Synthetic fallback parameters only.
