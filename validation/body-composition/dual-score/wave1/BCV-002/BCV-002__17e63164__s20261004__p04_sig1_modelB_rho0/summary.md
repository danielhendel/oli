# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 1
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.5545 | 1.5075 | 0.5008 | 0.6198 |
| perf | 70.0000 | 300000 | true | 0.2924 | 1.1960 | 0.5004 | 0.2750 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8855, H2=0.1145, H3=0.0000
- perf: P1=-0.0027, P3=1.0027

No product bands, no clinical claims. Synthetic fallback parameters only.
