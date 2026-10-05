# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.0810 | 3.1454 | 0.4946 | 2.5482 |
| perf | 22.8750 | 120000 | true | 0.9508 | 8.7789 | 0.3638 | 9.7302 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7202, H2=0.0671, H3=0.2127
- perf: P1=0.9904, P3=0.0096

No product bands, no clinical claims. Synthetic fallback parameters only.
