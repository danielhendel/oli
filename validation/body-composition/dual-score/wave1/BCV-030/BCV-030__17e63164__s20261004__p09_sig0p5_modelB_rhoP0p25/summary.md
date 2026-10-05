# BCV-030 — Aggregate uncertainty propagation

- persona: P-09 (male), sigma multiplier: 0.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 0.2938 | 0.8556 | 0.4968 | 0.1905 |
| perf | 89.5833 | 120000 | true | 0.2210 | 0.6430 | 0.4993 | 0.1074 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7952, H2=0.2048, H3=0.0000
- perf: P1=0.0000, P3=1.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
