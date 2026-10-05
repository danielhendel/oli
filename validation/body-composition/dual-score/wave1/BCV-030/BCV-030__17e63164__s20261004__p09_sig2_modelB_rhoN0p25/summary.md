# BCV-030 — Aggregate uncertainty propagation

- persona: P-09 (male), sigma multiplier: 2
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 1.1804 | 3.4157 | 0.4968 | 3.0538 |
| perf | 89.5833 | 160000 | true | 0.8808 | 2.5531 | 0.4993 | 1.6983 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7947, H2=0.2053, H3=0.0000
- perf: P1=-0.0020, P3=1.0020

No product bands, no clinical claims. Synthetic fallback parameters only.
