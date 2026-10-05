# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.1049 | 3.2251 | 0.4949 | 2.6712 |
| perf | 22.8750 | 120000 | true | 0.9589 | 8.6610 | 0.3393 | 9.2932 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6876, H2=0.0870, H3=0.2254
- perf: P1=1.0163, P3=-0.0163

No product bands, no clinical claims. Synthetic fallback parameters only.
