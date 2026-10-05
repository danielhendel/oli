# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 0.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3368 | 0.9806 | 0.4982 | 0.2499 |
| perf | 45.1316 | 120000 | true | 0.4377 | 1.3119 | 0.4976 | 0.4334 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7287, H2=-0.0081, H3=0.2794
- perf: P1=1.2854, P3=-0.2854

No product bands, no clinical claims. Synthetic fallback parameters only.
