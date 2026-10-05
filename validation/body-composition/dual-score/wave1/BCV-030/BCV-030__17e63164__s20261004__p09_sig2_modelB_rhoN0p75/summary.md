# BCV-030 — Aggregate uncertainty propagation

- persona: P-09 (male), sigma multiplier: 2
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 1.1820 | 3.4265 | 0.4968 | 3.0625 |
| perf | 89.5833 | 250000 | true | 0.8809 | 2.5644 | 0.4992 | 1.7088 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7932, H2=0.2068, H3=0.0000
- perf: P1=0.0004, P3=0.9996

No product bands, no clinical claims. Synthetic fallback parameters only.
