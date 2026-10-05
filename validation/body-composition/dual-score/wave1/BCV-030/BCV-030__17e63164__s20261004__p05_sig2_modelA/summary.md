# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8008 | 2.3294 | 0.4987 | 1.4119 |
| perf | 51.0000 | 130000 | true | 0.3514 | 4.5239 | 0.1699 | 3.7665 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8072, H2=0.1594, H3=0.0335
- perf: P1=0.8762, P3=0.1238

No product bands, no clinical claims. Synthetic fallback parameters only.
