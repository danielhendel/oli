# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 1
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.6737 | 1.9606 | 0.4992 | 0.9975 |
| perf | 45.1316 | 120000 | true | 0.8734 | 2.8891 | 0.4965 | 1.9996 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7282, H2=-0.0091, H3=0.2809
- perf: P1=1.2745, P3=-0.2745

No product bands, no clinical claims. Synthetic fallback parameters only.
