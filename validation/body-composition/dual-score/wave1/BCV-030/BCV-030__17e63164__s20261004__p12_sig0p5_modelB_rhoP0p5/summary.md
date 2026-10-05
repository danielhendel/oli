# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 0.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3481 | 1.0123 | 0.4987 | 0.2666 |
| perf | 45.1316 | 120000 | true | 0.4715 | 1.3917 | 0.4974 | 0.4926 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6848, H2=0.0219, H3=0.2933
- perf: P1=1.1880, P3=-0.1880

No product bands, no clinical claims. Synthetic fallback parameters only.
