# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 1.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 1.0440 | 3.0077 | 0.4999 | 2.3558 |
| perf | 45.1316 | 120000 | true | 1.7714 | 5.9923 | 0.4964 | 8.6686 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6805, H2=0.0213, H3=0.2983
- perf: P1=0.9755, P3=0.0245

No product bands, no clinical claims. Synthetic fallback parameters only.
