# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5973 | 1.7427 | 0.5001 | 0.7916 |
| perf | 51.0000 | 170000 | true | 0.2577 | 2.5024 | 0.1417 | 1.5038 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8128, H2=0.1667, H3=0.0205
- perf: P1=0.7932, P3=0.2068

No product bands, no clinical claims. Synthetic fallback parameters only.
