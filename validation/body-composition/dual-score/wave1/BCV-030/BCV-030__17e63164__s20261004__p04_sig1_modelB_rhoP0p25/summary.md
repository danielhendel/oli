# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 1
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.5555 | 1.4957 | 0.4990 | 0.6149 |
| perf | 70.0000 | 340000 | true | 0.2920 | 1.1942 | 0.4997 | 0.2741 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8881, H2=0.1119, H3=0.0000
- perf: P1=-0.0036, P3=1.0036

No product bands, no clinical claims. Synthetic fallback parameters only.
