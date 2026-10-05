# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 1
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.3965 | 1.1504 | 0.4986 | 0.3441 |
| perf | 51.0000 | 120000 | true | 0.0677 | 1.0344 | 0.0573 | 0.2586 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8357, H2=0.1626, H3=0.0018
- perf: P1=0.5810, P3=0.4190

No product bands, no clinical claims. Synthetic fallback parameters only.
