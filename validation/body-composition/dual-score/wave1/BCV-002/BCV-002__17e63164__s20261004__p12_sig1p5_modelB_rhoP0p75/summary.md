# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 1.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 150000 | true | 1.0077 | 2.9061 | 0.4990 | 2.2127 |
| perf | 45.1316 | 120000 | true | 1.3348 | 4.8897 | 0.4965 | 5.5533 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7233, H2=-0.0094, H3=0.2861
- perf: P1=1.2554, P3=-0.2554

No product bands, no clinical claims. Synthetic fallback parameters only.
