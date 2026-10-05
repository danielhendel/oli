# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.9729 | 2.8106 | 0.4988 | 2.0652 |
| perf | 52.6377 | 140000 | true | 1.7950 | 5.2532 | 0.4970 | 7.1320 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5022, H2=0.0465, H3=0.4513
- perf: P1=1.0418, P3=-0.0418

No product bands, no clinical claims. Synthetic fallback parameters only.
