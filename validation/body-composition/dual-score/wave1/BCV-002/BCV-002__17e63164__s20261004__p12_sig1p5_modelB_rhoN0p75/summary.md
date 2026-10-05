# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 1.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 170000 | true | 1.0097 | 2.8942 | 0.4982 | 2.2057 |
| perf | 45.1316 | 120000 | true | 1.8339 | 6.2341 | 0.4961 | 9.3463 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7219, H2=-0.0093, H3=0.2873
- perf: P1=0.9465, P3=0.0535

No product bands, no clinical claims. Synthetic fallback parameters only.
