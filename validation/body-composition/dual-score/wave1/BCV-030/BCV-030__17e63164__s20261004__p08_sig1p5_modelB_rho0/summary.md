# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.8462 | 2.4616 | 0.4983 | 1.5649 |
| perf | 22.8750 | 120000 | true | 0.7234 | 6.4039 | 0.3114 | 5.0436 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6525, H2=0.0848, H3=0.2628
- perf: P1=1.0445, P3=-0.0445

No product bands, no clinical claims. Synthetic fallback parameters only.
