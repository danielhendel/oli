# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 0.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.1973 | 0.5755 | 0.4990 | 0.0861 |
| perf | 51.0000 | 120000 | true | 0.0004 | 0.4382 | 0.0009 | 0.0244 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8391, H2=0.1609, H3=0.0000
- perf: P1=0.0140, P3=0.9860

No product bands, no clinical claims. Synthetic fallback parameters only.
