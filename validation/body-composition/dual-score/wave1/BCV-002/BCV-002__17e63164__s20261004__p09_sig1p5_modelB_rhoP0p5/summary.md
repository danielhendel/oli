# BCV-002 — Measurement perturbation

- persona: P-09 (male), sigma multiplier: 1.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 0.8820 | 2.5615 | 0.5005 | 1.7054 |
| perf | 89.5833 | 300000 | true | 0.6621 | 1.9207 | 0.5006 | 0.9633 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7946, H2=0.2054, H3=0.0000
- perf: P1=-0.0013, P3=1.0013

No product bands, no clinical claims. Synthetic fallback parameters only.
