# BCV-002 — Measurement perturbation

- persona: P-09 (male), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 1.1720 | 3.4105 | 0.5007 | 3.0331 |
| perf | 89.5833 | 240000 | true | 0.8763 | 2.5463 | 0.4989 | 1.6918 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7929, H2=0.2071, H3=0.0000
- perf: P1=-0.0054, P3=1.0054

No product bands, no clinical claims. Synthetic fallback parameters only.
