# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 0.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3510 | 1.0286 | 0.4996 | 0.2743 |
| perf | 45.1316 | 120000 | true | 0.5052 | 1.4657 | 0.4929 | 0.5530 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6616, H2=0.0380, H3=0.3004
- perf: P1=1.1139, P3=-0.1139

No product bands, no clinical claims. Synthetic fallback parameters only.
