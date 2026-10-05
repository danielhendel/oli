# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5965 | 1.7399 | 0.4983 | 0.7864 |
| perf | 51.0000 | 120000 | true | 0.1469 | 2.2492 | 0.1159 | 1.2642 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8254, H2=0.1627, H3=0.0120
- perf: P1=0.8349, P3=0.1651

No product bands, no clinical claims. Synthetic fallback parameters only.
