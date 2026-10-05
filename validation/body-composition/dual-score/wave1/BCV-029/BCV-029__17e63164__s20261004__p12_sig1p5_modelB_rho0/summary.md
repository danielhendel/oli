# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 130000 | true | 1.0659 | 3.0753 | 0.5021 | 2.4688 |
| perf | 45.1316 | 120000 | true | 1.6252 | 5.5782 | 0.4970 | 7.4832 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6504, H2=0.0442, H3=0.3055
- perf: P1=1.0589, P3=-0.0589

No product bands, no clinical claims. Synthetic fallback parameters only.
