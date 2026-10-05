# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 1
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.3967 | 1.1512 | 0.4998 | 0.3444 |
| perf | 51.0000 | 120000 | true | 0.0678 | 1.0355 | 0.0566 | 0.2644 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8359, H2=0.1624, H3=0.0016
- perf: P1=0.5894, P3=0.4106

No product bands, no clinical claims. Synthetic fallback parameters only.
