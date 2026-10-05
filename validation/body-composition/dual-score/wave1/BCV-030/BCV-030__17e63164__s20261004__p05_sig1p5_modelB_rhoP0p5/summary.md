# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5960 | 1.7360 | 0.4985 | 0.7834 |
| perf | 51.0000 | 120000 | true | 0.2273 | 2.4984 | 0.1340 | 1.4664 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8212, H2=0.1633, H3=0.0155
- perf: P1=0.7984, P3=0.2016

No product bands, no clinical claims. Synthetic fallback parameters only.
