# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 1
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.3950 | 1.1473 | 0.4988 | 0.3429 |
| perf | 51.0000 | 120000 | true | 0.0588 | 1.0368 | 0.0538 | 0.2597 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8385, H2=0.1606, H3=0.0009
- perf: P1=0.5932, P3=0.4068

No product bands, no clinical claims. Synthetic fallback parameters only.
