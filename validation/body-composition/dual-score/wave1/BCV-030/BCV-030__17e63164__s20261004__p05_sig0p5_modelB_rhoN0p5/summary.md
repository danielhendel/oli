# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 0.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.1981 | 0.5776 | 0.4990 | 0.0865 |
| perf | 51.0000 | 120000 | true | 0.0000 | 0.4352 | 0.0006 | 0.0240 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8415, H2=0.1585, H3=0.0000
- perf: P1=0.0077, P3=0.9923

No product bands, no clinical claims. Synthetic fallback parameters only.
