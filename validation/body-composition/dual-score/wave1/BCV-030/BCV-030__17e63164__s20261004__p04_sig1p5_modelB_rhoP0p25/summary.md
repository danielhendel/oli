# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 160000 | true | 0.8089 | 2.2099 | 0.4986 | 1.3146 |
| perf | 70.0000 | 280000 | true | 0.4345 | 1.7474 | 0.5000 | 0.5958 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8808, H2=0.1192, H3=-0.0000
- perf: P1=-0.0166, P3=1.0166

No product bands, no clinical claims. Synthetic fallback parameters only.
