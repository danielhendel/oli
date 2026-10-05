# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 1.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 220000 | true | 1.0671 | 3.0645 | 0.4997 | 2.4706 |
| perf | 45.1316 | 120000 | true | 1.6375 | 5.5823 | 0.4983 | 7.5287 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6500, H2=0.0444, H3=0.3057
- perf: P1=1.0592, P3=-0.0592

No product bands, no clinical claims. Synthetic fallback parameters only.
