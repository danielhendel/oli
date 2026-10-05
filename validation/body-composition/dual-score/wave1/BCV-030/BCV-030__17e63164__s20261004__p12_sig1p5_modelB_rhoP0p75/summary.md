# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 1.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 170000 | true | 1.0095 | 2.8959 | 0.4987 | 2.2065 |
| perf | 45.1316 | 120000 | true | 1.3320 | 4.8828 | 0.4975 | 5.5305 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7225, H2=-0.0098, H3=0.2873
- perf: P1=1.2555, P3=-0.2555

No product bands, no clinical claims. Synthetic fallback parameters only.
