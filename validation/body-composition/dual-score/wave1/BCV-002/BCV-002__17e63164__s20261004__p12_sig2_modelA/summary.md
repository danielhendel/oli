# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 210000 | true | 1.4136 | 4.0636 | 0.4995 | 4.3327 |
| perf | 45.1316 | 130000 | true | 2.2424 | 7.9430 | 0.4939 | 14.9049 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6401, H2=0.0441, H3=0.3158
- perf: P1=1.0605, P3=-0.0605

No product bands, no clinical claims. Synthetic fallback parameters only.
