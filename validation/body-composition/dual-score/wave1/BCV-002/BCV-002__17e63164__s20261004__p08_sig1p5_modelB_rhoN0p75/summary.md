# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 1.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.7837 | 2.2781 | 0.4964 | 1.3458 |
| perf | 22.8750 | 120000 | true | 0.7337 | 6.7129 | 0.3847 | 5.8098 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7609, H2=0.0174, H3=0.2218
- perf: P1=0.9690, P3=0.0310

No product bands, no clinical claims. Synthetic fallback parameters only.
