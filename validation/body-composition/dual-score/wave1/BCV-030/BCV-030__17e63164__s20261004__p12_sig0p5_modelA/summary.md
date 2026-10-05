# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 0.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3564 | 1.0304 | 0.4993 | 0.2777 |
| perf | 45.1316 | 120000 | true | 0.5305 | 1.5486 | 0.4982 | 0.6133 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6533, H2=0.0430, H3=0.3037
- perf: P1=1.0526, P3=-0.0526

No product bands, no clinical claims. Synthetic fallback parameters only.
