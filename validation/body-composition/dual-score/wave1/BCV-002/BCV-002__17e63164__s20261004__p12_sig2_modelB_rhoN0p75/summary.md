# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 200000 | true | 1.3410 | 3.8306 | 0.4979 | 3.8557 |
| perf | 45.1316 | 120000 | true | 2.5145 | 8.7549 | 0.4962 | 18.3805 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7158, H2=-0.0106, H3=0.2949
- perf: P1=0.9512, P3=0.0488

No product bands, no clinical claims. Synthetic fallback parameters only.
