# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 260000 | true | 1.3857 | 3.9697 | 0.4997 | 4.1426 |
| perf | 45.1316 | 150000 | true | 2.4202 | 8.5020 | 0.4973 | 17.1833 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6710, H2=0.0218, H3=0.3072
- perf: P1=0.9822, P3=0.0178

No product bands, no clinical claims. Synthetic fallback parameters only.
