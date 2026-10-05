# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2707 | 0.7848 | 0.4995 | 0.1605 |
| perf | 22.8750 | 120000 | true | 0.2355 | 1.9913 | 0.1779 | 0.4567 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6900, H2=-0.0142, H3=0.3241
- perf: P1=1.1496, P3=-0.1496

No product bands, no clinical claims. Synthetic fallback parameters only.
