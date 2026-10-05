# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 1.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.7831 | 2.2800 | 0.4965 | 1.3420 |
| perf | 22.8750 | 120000 | true | 0.7130 | 6.0553 | 0.1779 | 4.2536 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7609, H2=0.0182, H3=0.2209
- perf: P1=1.1489, P3=-0.1489

No product bands, no clinical claims. Synthetic fallback parameters only.
