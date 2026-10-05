# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 1
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.6942 | 2.0165 | 0.4993 | 1.0626 |
| perf | 45.1316 | 120000 | true | 1.1701 | 3.6779 | 0.4966 | 3.3564 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6849, H2=0.0239, H3=0.2913
- perf: P1=0.9688, P3=0.0312

No product bands, no clinical claims. Synthetic fallback parameters only.
