# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8059 | 2.3593 | 0.4996 | 1.4343 |
| perf | 51.0000 | 140000 | true | 0.2374 | 4.1952 | 0.1531 | 3.3110 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7914, H2=0.1663, H3=0.0423
- perf: P1=0.9240, P3=0.0760

No product bands, no clinical claims. Synthetic fallback parameters only.
