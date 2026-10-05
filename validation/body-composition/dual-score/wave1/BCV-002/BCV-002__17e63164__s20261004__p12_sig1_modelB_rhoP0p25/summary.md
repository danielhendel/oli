# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 1
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.7056 | 2.0576 | 0.4997 | 1.0989 |
| perf | 45.1316 | 120000 | true | 1.0059 | 3.1939 | 0.4928 | 2.5381 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6603, H2=0.0397, H3=0.3000
- perf: P1=1.1123, P3=-0.1123

No product bands, no clinical claims. Synthetic fallback parameters only.
