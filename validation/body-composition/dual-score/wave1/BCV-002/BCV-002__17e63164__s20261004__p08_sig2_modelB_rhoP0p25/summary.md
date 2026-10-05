# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.1029 | 3.2216 | 0.4956 | 2.6726 |
| perf | 22.8750 | 140000 | true | 0.9474 | 8.3411 | 0.2773 | 8.3263 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6880, H2=0.0850, H3=0.2270
- perf: P1=1.0762, P3=-0.0762

No product bands, no clinical claims. Synthetic fallback parameters only.
