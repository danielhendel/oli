# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 0.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.1960 | 0.5728 | 0.4989 | 0.0855 |
| perf | 51.0000 | 120000 | true | 0.0015 | 0.4366 | 0.0008 | 0.0243 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8390, H2=0.1610, H3=0.0000
- perf: P1=0.0110, P3=0.9890

No product bands, no clinical claims. Synthetic fallback parameters only.
