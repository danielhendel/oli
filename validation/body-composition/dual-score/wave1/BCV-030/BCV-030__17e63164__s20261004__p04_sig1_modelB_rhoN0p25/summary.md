# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 1
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.5523 | 1.5045 | 0.4989 | 0.6207 |
| perf | 70.0000 | 370000 | true | 0.2929 | 1.1968 | 0.5001 | 0.2752 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8879, H2=0.1121, H3=0.0000
- perf: P1=-0.0019, P3=1.0019

No product bands, no clinical claims. Synthetic fallback parameters only.
