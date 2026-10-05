# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 1
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.6743 | 1.9520 | 0.4990 | 0.9950 |
| perf | 45.1316 | 120000 | true | 1.2121 | 3.7784 | 0.4962 | 3.5630 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7264, H2=-0.0077, H3=0.2812
- perf: P1=0.9346, P3=0.0654

No product bands, no clinical claims. Synthetic fallback parameters only.
