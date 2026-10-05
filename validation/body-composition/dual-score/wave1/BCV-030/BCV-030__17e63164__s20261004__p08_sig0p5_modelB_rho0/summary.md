# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2944 | 0.8547 | 0.4989 | 0.1904 |
| perf | 22.8750 | 120000 | true | 0.2407 | 2.1118 | 0.3114 | 0.5434 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5817, H2=0.0669, H3=0.3514
- perf: P1=1.0448, P3=-0.0448

No product bands, no clinical claims. Synthetic fallback parameters only.
