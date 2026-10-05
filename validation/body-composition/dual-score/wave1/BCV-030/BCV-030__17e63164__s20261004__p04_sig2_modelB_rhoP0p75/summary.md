# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 2
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 190000 | true | 1.0488 | 2.9192 | 0.4983 | 2.2663 |
| perf | 70.0000 | 240000 | true | 0.5804 | 2.2197 | 0.5007 | 0.9872 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8775, H2=0.1225, H3=-0.0001
- perf: P1=-0.0507, P3=1.0507

No product bands, no clinical claims. Synthetic fallback parameters only.
