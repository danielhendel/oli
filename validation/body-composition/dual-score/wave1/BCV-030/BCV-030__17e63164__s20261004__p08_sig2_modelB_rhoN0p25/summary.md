# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.1005 | 3.2326 | 0.4957 | 2.6721 |
| perf | 22.8750 | 120000 | true | 0.9524 | 8.6055 | 0.3389 | 9.2141 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6893, H2=0.0837, H3=0.2270
- perf: P1=1.0158, P3=-0.0158

No product bands, no clinical claims. Synthetic fallback parameters only.
