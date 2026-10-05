# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 1.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 1.0419 | 3.0107 | 0.4990 | 2.3658 |
| perf | 45.1316 | 120000 | true | 1.4470 | 5.0465 | 0.4975 | 6.0828 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6761, H2=0.0210, H3=0.3029
- perf: P1=1.1759, P3=-0.1759

No product bands, no clinical claims. Synthetic fallback parameters only.
