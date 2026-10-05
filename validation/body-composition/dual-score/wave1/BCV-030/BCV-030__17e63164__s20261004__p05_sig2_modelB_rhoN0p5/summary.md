# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8007 | 2.3588 | 0.4984 | 1.4377 |
| perf | 51.0000 | 150000 | true | 0.2312 | 4.2080 | 0.1526 | 3.3091 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7916, H2=0.1647, H3=0.0437
- perf: P1=0.9271, P3=0.0729

No product bands, no clinical claims. Synthetic fallback parameters only.
