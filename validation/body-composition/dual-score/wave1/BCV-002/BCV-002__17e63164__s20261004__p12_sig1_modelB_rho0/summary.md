# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 1
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 150000 | true | 0.7131 | 2.0675 | 0.4988 | 1.1120 |
| perf | 45.1316 | 120000 | true | 1.0644 | 3.3439 | 0.4940 | 2.7993 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6531, H2=0.0440, H3=0.3030
- perf: P1=1.0573, P3=-0.0573

No product bands, no clinical claims. Synthetic fallback parameters only.
