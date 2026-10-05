# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.8438 | 2.4531 | 0.4985 | 1.5613 |
| perf | 22.8750 | 120000 | true | 0.7186 | 6.3927 | 0.3104 | 5.0426 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6566, H2=0.0840, H3=0.2595
- perf: P1=1.0440, P3=-0.0440

No product bands, no clinical claims. Synthetic fallback parameters only.
