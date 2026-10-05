# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 0.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3460 | 1.0078 | 0.5000 | 0.2650 |
| perf | 45.1316 | 120000 | true | 0.5821 | 1.6940 | 0.4962 | 0.7408 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6869, H2=0.0217, H3=0.2914
- perf: P1=0.9624, P3=0.0376

No product bands, no clinical claims. Synthetic fallback parameters only.
