# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 150000 | true | 1.4051 | 4.0493 | 0.4994 | 4.2892 |
| perf | 45.1316 | 120000 | true | 2.3380 | 8.1494 | 0.4952 | 15.8601 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6467, H2=0.0386, H3=0.3147
- perf: P1=1.0183, P3=-0.0183

No product bands, no clinical claims. Synthetic fallback parameters only.
