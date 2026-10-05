# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 140000 | true | 0.8084 | 2.2031 | 0.4984 | 1.3126 |
| perf | 70.0000 | 200000 | true | 0.4367 | 1.7470 | 0.5007 | 0.5999 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8808, H2=0.1192, H3=-0.0000
- perf: P1=-0.0121, P3=1.0121

No product bands, no clinical claims. Synthetic fallback parameters only.
