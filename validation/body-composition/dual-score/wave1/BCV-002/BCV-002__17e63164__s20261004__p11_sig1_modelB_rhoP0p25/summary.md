# BCV-002 — Measurement perturbation

- persona: P-11 (female), sigma multiplier: 1
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 93.4182 | 120000 | true | 0.3742 | 1.0912 | 0.5000 | 0.3101 |
| perf | 87.0526 | 120000 | true | 1.1927 | 3.4602 | 0.4977 | 3.0609 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.9983, H2=0.0000, H3=0.0017
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
