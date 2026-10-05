# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 140000 | true | 0.8133 | 2.2111 | 0.4984 | 1.3233 |
| perf | 70.0000 | 320000 | true | 0.4400 | 1.7811 | 0.4996 | 0.6174 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8810, H2=0.1190, H3=0.0000
- perf: P1=-0.0006, P3=1.0006

No product bands, no clinical claims. Synthetic fallback parameters only.
