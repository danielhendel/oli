# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2846 | 0.8272 | 0.4988 | 0.1782 |
| perf | 22.8750 | 120000 | true | 0.2376 | 2.0403 | 0.2356 | 0.4904 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6248, H2=0.0347, H3=0.3405
- perf: P1=1.1107, P3=-0.1107

No product bands, no clinical claims. Synthetic fallback parameters only.
