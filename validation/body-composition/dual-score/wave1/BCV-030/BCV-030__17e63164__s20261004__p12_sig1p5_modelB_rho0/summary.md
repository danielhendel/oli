# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 170000 | true | 1.0684 | 3.0735 | 0.4995 | 2.4717 |
| perf | 45.1316 | 120000 | true | 1.6334 | 5.5771 | 0.4984 | 7.4965 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6444, H2=0.0442, H3=0.3115
- perf: P1=1.0593, P3=-0.0593

No product bands, no clinical claims. Synthetic fallback parameters only.
