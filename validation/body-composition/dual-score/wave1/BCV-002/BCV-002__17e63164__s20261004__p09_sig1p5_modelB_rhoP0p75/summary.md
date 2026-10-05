# BCV-002 — Measurement perturbation

- persona: P-09 (male), sigma multiplier: 1.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 0.8862 | 2.5654 | 0.5005 | 1.7203 |
| perf | 89.5833 | 280000 | true | 0.6646 | 1.9244 | 0.5004 | 0.9666 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7938, H2=0.2062, H3=0.0000
- perf: P1=-0.0014, P3=1.0014

No product bands, no clinical claims. Synthetic fallback parameters only.
