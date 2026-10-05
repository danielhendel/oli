# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8013 | 2.3492 | 0.4996 | 1.4245 |
| perf | 51.0000 | 120000 | true | 0.2976 | 4.3799 | 0.1633 | 3.5592 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8017, H2=0.1619, H3=0.0365
- perf: P1=0.8961, P3=0.1039

No product bands, no clinical claims. Synthetic fallback parameters only.
