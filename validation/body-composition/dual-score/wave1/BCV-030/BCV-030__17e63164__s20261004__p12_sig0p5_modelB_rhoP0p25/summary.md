# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 0.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3550 | 1.0255 | 0.4979 | 0.2745 |
| perf | 45.1316 | 120000 | true | 0.5059 | 1.4777 | 0.4980 | 0.5605 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6632, H2=0.0386, H3=0.2982
- perf: P1=1.1146, P3=-0.1146

No product bands, no clinical claims. Synthetic fallback parameters only.
