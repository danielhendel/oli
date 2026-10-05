# BCV-030 — Aggregate uncertainty propagation

- persona: P-09 (male), sigma multiplier: 1
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 0.5887 | 1.7121 | 0.4968 | 0.7627 |
| perf | 89.5833 | 230000 | true | 0.4418 | 1.2800 | 0.4998 | 0.4270 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7949, H2=0.2051, H3=0.0000
- perf: P1=-0.0000, P3=1.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
