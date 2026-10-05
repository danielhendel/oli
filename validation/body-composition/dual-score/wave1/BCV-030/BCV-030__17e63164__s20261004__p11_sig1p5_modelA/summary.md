# BCV-030 — Aggregate uncertainty propagation

- persona: P-11 (female), sigma multiplier: 1.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 93.4182 | 120000 | true | 0.5647 | 1.6538 | 0.4963 | 0.7050 |
| perf | 87.0526 | 120000 | true | 1.7957 | 4.4973 | 0.4996 | 6.3570 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.9758, H2=0.0000, H3=0.0242
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
